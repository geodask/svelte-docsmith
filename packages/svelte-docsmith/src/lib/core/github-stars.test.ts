import { describe, expect, it } from 'vitest';
import { formatStars, githubRepo } from './github-stars.js';

describe('formatStars', () => {
	it.each([
		[0, '0', '0'],
		[999, '999', '999'],
		[1234, '1.2k', '1,234'],
		[12_000, '12k', '12,000'],
		[1_250_000, '1.3m', '1,250,000']
	])('writes %d as %s, and %s in full', (stars, short, full) => {
		expect(formatStars(stars)).toEqual({ short, full });
	});
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
		'https://github.com/orgs/geodask',
		'https://github.com/sponsors/geodask',
		'https://github.com/Settings/profile',
		'https://github.com/',
		'github.com/o/r',
		'not a url'
	])('names no repo in %s', (url) => {
		expect(githubRepo(url)).toBeUndefined();
	});
});
