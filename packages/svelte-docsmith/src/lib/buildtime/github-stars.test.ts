import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearGithubStarsCache,
	fetchGithubStars,
	githubRepo,
	siteGithubStars
} from './github-stars.js';

const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init
	});

describe('githubRepo', () => {
	it.each([
		['https://github.com/geodask/svelte-docsmith', 'geodask', 'svelte-docsmith'],
		['https://github.com/geodask/svelte-docsmith/', 'geodask', 'svelte-docsmith'],
		['https://github.com/geodask/svelte-docsmith.git', 'geodask', 'svelte-docsmith'],
		['https://www.github.com/o/r', 'o', 'r'],
		['https://github.com/o/r/tree/main/packages/x', 'o', 'r']
	])('reads %s', (url, owner, repo) => {
		expect(githubRepo(url)).toEqual({ owner, repo });
	});

	it.each([
		'https://gitlab.com/o/r',
		'https://github.example.com/o/r',
		'https://codeberg.org/o/r',
		'https://github.com/geodask',
		'https://github.com/',
		'github.com/o/r',
		'not a url'
	])('names no repo in %s', (url) => {
		expect(githubRepo(url)).toBeUndefined();
	});
});

describe('fetchGithubStars', () => {
	const repo = { owner: 'o', repo: 'r' };

	it('returns stargazers_count, asking the repos endpoint', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 1234 }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBe(1234);
		expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/o/r', expect.anything());
		expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('authorization');
		expect(warn).not.toHaveBeenCalled();
	});

	it('sends the token when there is one', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 1 }));
		await fetchGithubStars(repo, { fetch, token: 'secret' });
		expect(fetch.mock.calls[0][1].headers.authorization).toBe('Bearer secret');
	});

	it('warns and returns undefined when GitHub cannot be reached', async () => {
		const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/skipping the GitHub star count for o\/r/);
		expect(warn.mock.calls[0][0]).toMatch(/Could not reach the GitHub API: fetch failed/);
	});

	it('points at GITHUB_TOKEN when rate-limited without one', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(json({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/rate-limited.*Set GITHUB_TOKEN/);
	});

	it('does not suggest a token when one was already sent', async () => {
		const fetch = vi.fn().mockResolvedValue(json({}, { status: 429 }));
		const warn = vi.fn();
		await fetchGithubStars(repo, { fetch, warn, token: 't' });
		expect(warn.mock.calls[0][0]).toMatch(/rate-limited/);
		expect(warn.mock.calls[0][0]).not.toMatch(/GITHUB_TOKEN/);
	});

	it('names the token when GitHub refuses it', async () => {
		const fetch = vi.fn().mockResolvedValue(json({}, { status: 401 }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn, token: 'stale' })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/refused the GITHUB_TOKEN/);
	});

	it('says a missing repo may be private', async () => {
		const fetch = vi.fn().mockResolvedValue(json({}, { status: 404 }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/private, or misspelled/);
	});

	it('warns on any other failed status', async () => {
		const fetch = vi.fn().mockResolvedValue(json({}, { status: 500 }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/GitHub answered 500/);
	});

	it('warns when the answer has no star count', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ name: 'r' }));
		const warn = vi.fn();
		expect(await fetchGithubStars(repo, { fetch, warn })).toBeUndefined();
		expect(warn.mock.calls[0][0]).toMatch(/without a star count/);
	});
});

describe('siteGithubStars', () => {
	beforeEach(() => clearGithubStarsCache());
	afterEach(() => vi.unstubAllEnvs());

	it('fetches once per repo, however often the site module loads', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 7 }));
		const site = { github: 'https://github.com/o/r' };
		expect(await siteGithubStars(site, { fetch })).toBe(7);
		expect(await siteGithubStars({ github: 'https://github.com/O/R/' }, { fetch })).toBe(7);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('uses GITHUB_TOKEN from the environment', async () => {
		vi.stubEnv('GITHUB_TOKEN', 'from-env');
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 1 }));
		await siteGithubStars({ github: 'https://github.com/o/r' }, { fetch });
		expect(fetch.mock.calls[0][1].headers.authorization).toBe('Bearer from-env');
	});

	it.each([
		['githubStars is false', { github: 'https://github.com/o/r', githubStars: false }],
		['there is no github link', {}],
		['the link is not a github.com repo', { github: 'https://gitlab.com/o/r' }]
	])('skips the fetch, without a warning, when %s', async (_, site) => {
		const fetch = vi.fn();
		const warn = vi.fn();
		expect(await siteGithubStars(site, { fetch, warn })).toBeUndefined();
		expect(fetch).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});
});
