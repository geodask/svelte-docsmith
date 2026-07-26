import { describe, expect, it } from 'vitest';
import type { DocsContentItem } from './content.js';
import {
	resolveVersions,
	activeVersion,
	currentVersion,
	currentOnly,
	scopeContent,
	mapPathToVersion,
	type DocsVersions,
	type ResolvedVersion
} from './version.js';

const versions: DocsVersions = {
	current: { id: 'v2', label: 'v2' },
	archived: [{ id: 'v1', label: 'v1' }]
};

// The current version's pages keep their unprefixed URLs; only archives are
// prefixed. See docs/adr/0001-unprefixed-current-docs.md.
const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', version: 'v2', order: 1 },
	{ title: 'Guide', path: '/docs/guide', version: 'v2', order: 2 },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1', order: 1 }
];

const resolved = resolveVersions(versions, '/docs', content);
const byId = (id: string) => resolved.find((v) => v.id === id) as ResolvedVersion;

describe('resolveVersions', () => {
	it('serves the current version unprefixed at the docs root', () => {
		expect(byId('v2').basePath).toBe('/docs');
		expect(byId('v2').current).toBe(true);
		expect(byId('v2').landing).toBe('/docs/intro');
	});

	it('prefixes each archived version with its id', () => {
		expect(byId('v1').basePath).toBe('/docs/v1');
		expect(byId('v1').current).toBe(false);
		expect(byId('v1').landing).toBe('/docs/v1/intro');
	});

	it('orders the manifest current-first, then archives as declared', () => {
		expect(resolved.map((v) => v.id)).toEqual(['v2', 'v1']);
	});

	it('leaves versions indexable by default, and honours an explicit noindex', () => {
		expect(byId('v1').noindex).toBe(false);
		const [, archived] = resolveVersions(
			{ current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1', noindex: true }] },
			'/docs',
			[]
		);
		expect(archived.noindex).toBe(true);
	});

	it('falls a version with no pages back to its own base', () => {
		const [only] = resolveVersions({ current: { id: 'v2', label: 'v2' } }, '/docs', []);
		expect(only.landing).toBe('/docs');
	});

	it('emits an empty manifest for an unversioned site', () => {
		expect(resolveVersions(undefined, '/docs', content)).toEqual([]);
	});
});

describe('activeVersion', () => {
	it('resolves an unprefixed page to the current version', () => {
		expect(activeVersion(resolved, '/docs/guide')?.id).toBe('v2');
		expect(activeVersion(resolved, '/docs')?.id).toBe('v2');
	});

	it('prefers the longer archive base over the current version', () => {
		expect(activeVersion(resolved, '/docs/v1/intro')?.id).toBe('v1');
	});

	it('matches on a segment boundary, not a string prefix', () => {
		const vs = resolveVersions(
			{
				current: { id: 'v3', label: 'v3' },
				archived: [
					{ id: 'v2', label: 'v2' },
					{ id: 'v20', label: 'v20' }
				]
			},
			'/docs',
			[]
		);
		expect(activeVersion(vs, '/docs/v20/x')?.id).toBe('v20');
	});

	it('is undefined off the docs tree, and on an unversioned site', () => {
		expect(activeVersion(resolved, '/blog/post')).toBeUndefined();
		expect(activeVersion([], '/docs/intro')).toBeUndefined();
	});
});

describe('currentVersion and currentOnly', () => {
	it('finds the current version', () => {
		expect(currentVersion(resolved)?.id).toBe('v2');
	});

	it('keeps only current pages, and is a no-op with no versions', () => {
		expect(currentOnly(content, resolved).map((c) => c.path)).toEqual([
			'/docs/intro',
			'/docs/guide'
		]);
		expect(currentOnly(content, [])).toBe(content);
	});
});

describe('scopeContent', () => {
	it('filters to one version', () => {
		expect(scopeContent(content, 'v1').map((c) => c.path)).toEqual(['/docs/v1/intro']);
	});

	it('passes content through unchanged for an unversioned site', () => {
		expect(scopeContent(content, undefined)).toBe(content);
	});
});

describe('mapPathToVersion', () => {
	it('maps a current page into an archive', () => {
		expect(mapPathToVersion('/docs/intro', byId('v2'), byId('v1'), ['/docs/v1/intro'])).toBe(
			'/docs/v1/intro'
		);
	});

	it('maps an archived page back to current', () => {
		expect(mapPathToVersion('/docs/v1/intro', byId('v1'), byId('v2'), ['/docs/intro'])).toBe(
			'/docs/intro'
		);
	});

	it("falls back to the target's landing when the page is missing there", () => {
		expect(mapPathToVersion('/docs/guide', byId('v2'), byId('v1'), ['/docs/v1/intro'])).toBe(
			'/docs/v1/intro'
		);
	});
});
