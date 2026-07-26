import { describe, expect, it } from 'vitest';
import type { DocsContentItem } from './content.js';
import {
	resolveVersions,
	activeVersion,
	latestVersion,
	latestLandingUrl,
	latestOnly,
	scopeContent,
	mapPathToVersion,
	type DocsVersion,
	type ResolvedVersion
} from './version.js';

const versions: DocsVersion[] = [
	{ id: 'next', label: 'v3 (next)', path: 'next', prerelease: true },
	{ id: 'v2', label: 'v2', path: 'v2', latest: true },
	{ id: 'v1', label: 'v1', path: 'v1' }
];

const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/v2/intro', version: 'v2', order: 1 },
	{ title: 'Guide', path: '/docs/v2/guide', version: 'v2', order: 2 },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1', order: 1 }
];

const resolved = resolveVersions(versions, '/docs', content);
const byId = (id: string) => resolved.find((v) => v.id === id) as ResolvedVersion;

describe('resolveVersions', () => {
	it('computes basePath, landing (first page in nav order), and noindex', () => {
		expect(byId('v2').basePath).toBe('/docs/v2');
		expect(byId('v2').landing).toBe('/docs/v2/intro');
		expect(byId('v2').noindex).toBe(false);
	});

	it('defaults a prerelease to noindex and falls back its landing to the base', () => {
		expect(byId('next').noindex).toBe(true); // prerelease ⇒ noindex
		expect(byId('next').landing).toBe('/docs/next'); // no pages yet ⇒ base
	});

	it('honours an explicit noindex override', () => {
		const [only] = resolveVersions(
			[{ id: 'v1', label: 'v1', path: 'v1', noindex: true }],
			'/docs',
			[]
		);
		expect(only.noindex).toBe(true);
	});
});

describe('activeVersion', () => {
	it('resolves the version owning a path', () => {
		expect(activeVersion(resolved, '/docs/v2/guide')?.id).toBe('v2');
		expect(activeVersion(resolved, '/docs/v1/intro')?.id).toBe('v1');
		expect(activeVersion(resolved, '/docs/next/anything')?.id).toBe('next');
	});

	it('matches on a segment boundary, not a string prefix', () => {
		const vs = resolveVersions(
			[
				{ id: 'v2', label: 'v2', path: 'v2', latest: true },
				{ id: 'v20', label: 'v20', path: 'v20' }
			],
			'/docs',
			[]
		);
		expect(activeVersion(vs, '/docs/v20/x')?.id).toBe('v20');
	});

	it('is undefined off the versioned tree', () => {
		expect(activeVersion(resolved, '/blog/post')).toBeUndefined();
		expect(activeVersion([], '/docs/intro')).toBeUndefined();
	});
});

describe('latest helpers', () => {
	it('finds the latest version and its landing', () => {
		expect(latestVersion(resolved)?.id).toBe('v2');
		expect(latestLandingUrl(resolved)).toBe('/docs/v2/intro');
	});

	it('latestOnly keeps only latest pages, and is a no-op with no versions', () => {
		expect(latestOnly(content, resolved).map((c) => c.path)).toEqual([
			'/docs/v2/intro',
			'/docs/v2/guide'
		]);
		expect(latestOnly(content, [])).toBe(content);
	});
});

describe('scopeContent', () => {
	it('filters to one version', () => {
		expect(scopeContent(content, 'v2').map((c) => c.path)).toEqual([
			'/docs/v2/intro',
			'/docs/v2/guide'
		]);
	});

	it('passes content through unchanged for an unversioned site', () => {
		expect(scopeContent(content, undefined)).toBe(content);
	});
});

describe('mapPathToVersion', () => {
	const targetPaths = ['/docs/v1/intro'];

	it('keeps the same page when it exists in the target version', () => {
		expect(mapPathToVersion('/docs/v2/intro', byId('v2'), byId('v1'), targetPaths)).toBe(
			'/docs/v1/intro'
		);
	});

	it("falls back to the target's landing when the page is missing there", () => {
		expect(mapPathToVersion('/docs/v2/guide', byId('v2'), byId('v1'), targetPaths)).toBe(
			'/docs/v1/intro'
		);
	});
});
