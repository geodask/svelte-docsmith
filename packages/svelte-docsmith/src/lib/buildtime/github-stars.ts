/**
 * The star count of the repo `site.github` points at, read from the GitHub API
 * at build time and served as `githubStars` from `svelte-docsmith/site`.
 *
 * Fetching here rather than in the reader's browser keeps the count off every
 * page view: no request per reader, no rate limit per reader IP, no number
 * popping in after the header renders. The trade is that the count is as old
 * as the build. When the build can't get it (most often a rate-limited shared
 * build machine with no `GITHUB_TOKEN`), the header falls back to fetching it
 * in the reader's browser: see `components/chrome/github-stars.svelte.ts`.
 *
 * Every failure is an `undefined` count and a reason handed to the caller,
 * never a thrown error: a missing number costs the header nothing but the
 * number. Reporting is the caller's to do, as for `commitDates` in `../git.js`.
 */
import type { DocsmithSite } from '../core/config.js';
import { githubRepo, type GithubRepo } from '../core/github-stars.js';

export type FetchGithubStarsOptions = {
	/** Swapped out in tests. */
	fetch?: typeof globalThis.fetch;
	/** Sent as a bearer token when set, for the higher authenticated rate limit. */
	token?: string;
};

const API = 'https://api.github.com/repos';
// Long enough for a slow connection, short enough that an offline build or
// `dev` start isn't held up noticeably.
const TIMEOUT_MS = 5000;

/**
 * Fetch a repo's star count. On any failure, hand `onSkip` the reason and
 * return `undefined`.
 */
export async function fetchGithubStars(
	{ owner, repo }: GithubRepo,
	onSkip: (reason: string) => void,
	{ fetch = globalThis.fetch, token }: FetchGithubStarsOptions = {}
): Promise<number | undefined> {
	const skip = (reason: string) => {
		onSkip(reason);
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
			signal: AbortSignal.timeout(TIMEOUT_MS)
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

/**
 * The star count `svelte-docsmith/site` serves for these site options:
 * `undefined` when `githubStars` is `false` or `github` names no github.com
 * repo (both quietly), or when the fetch fails (through `onSkip`). Sends
 * `GITHUB_TOKEN` from the environment unless a token is passed.
 */
export async function siteGithubStars(
	site: Pick<DocsmithSite, 'github' | 'githubStars'>,
	onSkip: (reason: string) => void,
	{ fetch, token = process.env.GITHUB_TOKEN || undefined }: FetchGithubStarsOptions = {}
): Promise<number | undefined> {
	if (site.githubStars === false || !site.github) return undefined;
	const repo = githubRepo(site.github);
	if (!repo) return undefined;
	return fetchGithubStars(repo, onSkip, { fetch, token });
}
