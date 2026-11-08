/**
 * How the header writes a star count: compact for the eye (`1.2k`), exact for
 * the accessible name (`1,234`). Pinned to English so the server and the
 * browser agree on every character, and lowercased because `1.2K` reads as a
 * unit more than a number.
 */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('en');

export function formatStars(stars: number): { short: string; full: string } {
	return { short: compact.format(stars).toLowerCase(), full: exact.format(stars) };
}

export type GithubRepo = { owner: string; repo: string };

// First path segments github.com serves its own pages under, so
// `github.com/orgs/acme` names an org page, not a repo called `orgs/acme`.
const RESERVED = new Set([
	'about',
	'apps',
	'collections',
	'enterprise',
	'explore',
	'features',
	'issues',
	'login',
	'marketplace',
	'new',
	'notifications',
	'organizations',
	'orgs',
	'pricing',
	'pulls',
	'search',
	'settings',
	'sponsors',
	'topics',
	'trending',
	'users'
]);

/**
 * Read `https://github.com/{owner}/{repo}` off a URL, or `undefined` when it
 * names no repo. Deeper paths (`/tree/main/…`) still name the repo, and a
 * trailing `.git` is dropped. Anything else (another host, an org, user or
 * GitHub's own page, not a URL at all) names none, and gets no count.
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
	if (!owner || !repo || RESERVED.has(owner.toLowerCase())) return undefined;
	return { owner, repo };
}
