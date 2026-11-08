/**
 * The star count of the repo `site.github` points at, read from the GitHub API
 * once at build time and served as `githubStars` from `svelte-docsmith/site`.
 *
 * Fetching here rather than in the reader's browser keeps the count off every
 * page view: no request per reader, no rate limit per reader IP, no number
 * popping in after the header renders. The trade is that the count is as old
 * as the build.
 *
 * Every failure is a warning and an `undefined` count, never a failed build: a
 * missing number costs the header nothing but the number.
 */

/** The `{owner}/{repo}` a GitHub URL names, or `undefined` when it names none. */
export type GithubRepo = { owner: string; repo: string };

/**
 * Read `https://github.com/{owner}/{repo}` off a URL. Deeper paths (`/tree/main/…`)
 * still name the repo, and a trailing `.git` is dropped. Anything else (another
 * host, an org or user page, not a URL at all) names no repo, and gets no count.
 */
export function githubRepo(url: string): GithubRepo | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
	if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return undefined;
	const [owner, rawRepo] = parsed.pathname.split('/').filter(Boolean);
	const repo = rawRepo?.replace(/\.git$/, '');
	if (!owner || !repo) return undefined;
	return { owner, repo };
}

export type FetchGithubStarsDeps = {
	fetch?: typeof globalThis.fetch;
	/** Sent as a bearer token when set, for the higher authenticated rate limit. */
	token?: string;
	warn?: (message: string) => void;
	/** Give up after this long, so an offline build doesn't hang. */
	timeoutMs?: number;
};

const API = 'https://api.github.com/repos';

/** Fetch a repo's star count, or warn and return `undefined`. */
export async function fetchGithubStars(
	{ owner, repo }: GithubRepo,
	{
		fetch = globalThis.fetch,
		token,
		warn = console.warn,
		timeoutMs = 5000
	}: FetchGithubStarsDeps = {}
): Promise<number | undefined> {
	const name = `${owner}/${repo}`;
	const skip = (reason: string) => {
		warn(
			`[svelte-docsmith] skipping the GitHub star count for ${name}\n` +
				`  ${reason}\n` +
				`  The header shows the GitHub link without a count. Set \`site.githubStars: false\` to stop fetching it.`
		);
		return undefined;
	};

	let response: Response;
	try {
		response = await fetch(`${API}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
			headers: {
				accept: 'application/vnd.github+json',
				'user-agent': 'svelte-docsmith',
				'x-github-api-version': '2022-11-28',
				...(token ? { authorization: `Bearer ${token}` } : {})
			},
			signal: AbortSignal.timeout(timeoutMs)
		});
	} catch (error) {
		return skip(`Could not reach the GitHub API: ${(error as Error)?.message ?? error}.`);
	}

	if (!response.ok) {
		const limited =
			response.status === 429 ||
			(response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0');
		if (limited) {
			return skip(
				token
					? 'GitHub rate-limited this build.'
					: 'GitHub rate-limited this build. Set GITHUB_TOKEN to raise the limit from 60 to 5,000 requests an hour.'
			);
		}
		if (response.status === 401) {
			return skip('GitHub refused the GITHUB_TOKEN this build sent. Is it expired or revoked?');
		}
		if (response.status === 404) {
			return skip('GitHub has no public repo by that name. Is it private, or misspelled?');
		}
		return skip(`GitHub answered ${response.status}.`);
	}

	try {
		const body = (await response.json()) as { stargazers_count?: unknown };
		const stars = body.stargazers_count;
		if (typeof stars !== 'number' || !Number.isFinite(stars)) {
			return skip('GitHub answered without a star count.');
		}
		return stars;
	} catch {
		return skip('GitHub answered with something other than JSON.');
	}
}

// One fetch per repo for the life of the process. SvelteKit builds the server
// and the client separately, each loading `vite.config` afresh, so a cache on
// the plugin would fetch twice and could hand the two halves different counts.
const cache = new Map<string, Promise<number | undefined>>();

/**
 * The star count `svelte-docsmith/site` serves for these site options:
 * `undefined` when `githubStars` is `false`, when `github` names no
 * github.com repo, or when the fetch fails.
 */
export function siteGithubStars(
	site: { github?: string; githubStars?: boolean },
	deps: FetchGithubStarsDeps = {}
): Promise<number | undefined> {
	if (site.githubStars === false || !site.github) return Promise.resolve(undefined);
	const repo = githubRepo(site.github);
	if (!repo) return Promise.resolve(undefined);
	const key = `${repo.owner}/${repo.repo}`.toLowerCase();
	let stars = cache.get(key);
	if (!stars) {
		stars = fetchGithubStars(repo, { token: process.env.GITHUB_TOKEN || undefined, ...deps });
		cache.set(key, stars);
	}
	return stars;
}

/** Forget every fetched count. For tests. */
export function clearGithubStarsCache(): void {
	cache.clear();
}
