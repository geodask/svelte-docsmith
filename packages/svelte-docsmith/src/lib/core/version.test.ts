import { describe, expect, it } from 'vitest';
import type { DocsContentItem } from './content.js';
import {
	resolveVersions,
	activeVersion,
	assertValidVersionId,
	checkVersions,
	currentVersion,
	currentOnly,
	scopeContent,
	mapPathToVersion,
	type ArchivesOnDisk,
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

// A site can put its docs at the routes root, which makes the current version's
// base `/`. Everything is then under it, so the switcher has to keep mapping
// pages instead of dumping every reader on the landing page.
describe('a docs base of "/"', () => {
	const rooted = resolveVersions(versions, '/', [
		{ title: 'Intro', path: '/intro', version: 'v2', order: 1 },
		{ title: 'Intro', path: '/v1/intro', version: 'v1', order: 1 }
	]);
	const at = (id: string) => rooted.find((v) => v.id === id) as ResolvedVersion;

	it('bases the current version at the root and archives below it', () => {
		expect(at('v2').basePath).toBe('/');
		expect(at('v1').basePath).toBe('/v1');
	});

	it('finds the current version for a page at the root', () => {
		expect(activeVersion(rooted, '/intro')?.id).toBe('v2');
		expect(activeVersion(rooted, '/v1/intro')?.id).toBe('v1');
	});

	it('maps a rooted page into an archive rather than falling back', () => {
		expect(mapPathToVersion('/intro', at('v2'), at('v1'), ['/v1/intro'])).toBe('/v1/intro');
		expect(mapPathToVersion('/v1/intro', at('v1'), at('v2'), ['/intro'])).toBe('/intro');
	});
});

// --- validation and config/disk reconciliation ---------------------------

const MARKER = '.docsmith-archive';

/** A docs root holding exactly the given directories, all of them marked. */
const disk = (marked: string[], extra: string[] = []): ArchivesOnDisk => ({
	marked,
	directories: [...marked, ...extra]
});

describe('assertValidVersionId', () => {
	it('accepts ids that are safe as a directory and a URL segment', () => {
		for (const id of ['v1', 'v1.0', '2.x', 'next', 'V1', 'my-docs', 'a_b']) {
			expect(() => assertValidVersionId(id)).not.toThrow();
		}
	});

	it('rejects ids that would escape the docs root or hide the route', () => {
		for (const id of ['../evil', '.hidden', '.', '..', 'api/v1', '-v1', 'v 1', '[slug]', '']) {
			expect(() => assertValidVersionId(id)).toThrow(/invalid version id/);
		}
	});

	it('rejects a non-string, for configs built dynamically', () => {
		expect(() => assertValidVersionId(undefined)).toThrow(/invalid version id/);
		expect(() => assertValidVersionId(2)).toThrow(/invalid version id/);
	});
});

describe('checkVersions', () => {
	it('does nothing for an unversioned site', () => {
		expect(() => checkVersions(undefined, disk([]), MARKER)).not.toThrow();
	});

	it('accepts a config that matches the docs root', () => {
		expect(() => checkVersions(versions, disk(['v1']), MARKER)).not.toThrow();
	});

	it('accepts a current version with no archives at all', () => {
		const only = { current: { id: 'v2', label: 'v2' } };
		expect(() => checkVersions(only, disk([], ['guides']), MARKER)).not.toThrow();
	});

	// The id is a URL segment and a directory name, so this is the traversal guard.
	it('rejects an archived id that is not segment-safe', () => {
		const bad = { current: { id: 'v2', label: 'v2' }, archived: [{ id: '../evil', label: 'x' }] };
		expect(() => checkVersions(bad, disk([]), MARKER)).toThrow(/invalid version id/);
	});

	// current.id is never a segment itself, but archiving retires it into one.
	it('rejects a current id that is not segment-safe', () => {
		const bad = { current: { id: '../evil', label: 'x' } };
		expect(() => checkVersions(bad, disk([]), MARKER)).toThrow(/invalid version id/);
	});

	it('rejects an archived id that collides with the current one', () => {
		const dup = { current: { id: 'v1', label: 'v1' }, archived: [{ id: 'v1', label: 'old' }] };
		expect(() => checkVersions(dup, disk(['v1']), MARKER)).toThrow(/duplicate version id/);
	});

	it('rejects two archives sharing an id', () => {
		const dup = {
			current: { id: 'v3', label: 'v3' },
			archived: [
				{ id: 'v1', label: 'v1' },
				{ id: 'v1', label: 'also v1' }
			]
		};
		expect(() => checkVersions(dup, disk(['v1']), MARKER)).toThrow(/duplicate version id/);
	});

	// Without this the archive is merged into the current version and its pages
	// are served at current-version URLs. See docs/adr/0003.
	it('rejects an archive on disk that the config does not declare', () => {
		const only = { current: { id: 'v2', label: 'v2' } };
		expect(() => checkVersions(only, disk(['v1']), MARKER)).toThrow(/not declared/);
	});

	it('prints the config to paste for an undeclared archive', () => {
		const only = { current: { id: 'v2', label: 'v2' } };
		expect(() => checkVersions(only, disk(['v1']), MARKER)).toThrow(
			/archived: \[\{ id: 'v1', label: 'v1' \}\]/
		);
	});

	it('keeps already-declared archives in the config it prints', () => {
		expect(() => checkVersions(versions, disk(['v1', 'v0']), MARKER)).toThrow(
			/archived: \[\{ id: 'v0', label: 'v0' \}, \{ id: 'v1', label: 'v1' \}\]/
		);
	});

	it('rejects a declared archive with no directory at all', () => {
		expect(() => checkVersions(versions, disk([]), MARKER)).toThrow(/No directory for `v1`/);
	});

	// The mirror of the undeclared case: a section folder declared as a version
	// silently drops its pages out of the current sidebar and search.
	it('rejects a declared archive whose directory carries no marker', () => {
		expect(() => checkVersions(versions, disk([], ['v1']), MARKER)).toThrow(
			/carries no `\.docsmith-archive`/
		);
	});

	it('leaves unmarked directories alone when nothing declares them', () => {
		expect(() =>
			checkVersions(versions, disk(['v1'], ['guides', 'concepts']), MARKER)
		).not.toThrow();
	});
});
