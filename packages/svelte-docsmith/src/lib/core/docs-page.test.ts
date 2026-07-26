import { describe, expect, it } from 'vitest';
import type { DocsContentItem } from './content.js';
import { resolveVersions } from './version.js';
import { resolveDocsPage } from './docs-page.js';

// The current version is unprefixed at the docs root; only archives carry their
// id as a URL segment. See docs/adr/0001-unprefixed-current-docs.md.
const content: DocsContentItem[] = [
	{
		title: 'Intro',
		path: '/docs/intro',
		section: 'Start',
		order: 1,
		version: 'v2',
		sourcePath: 'src/routes/docs/intro/+page.md',
		lastUpdated: '2026-07-01T10:00:00.000Z',
		readingTime: 4,
		toc: [{ id: 'why', title: 'Why', depth: 2 }]
	},
	{ title: 'Guide', path: '/docs/guide', section: 'Start', order: 2, version: 'v2' },
	{
		title: 'Middleware',
		path: '/docs/middleware',
		section: ['Guides', 'Advanced'],
		order: 3,
		version: 'v2'
	},
	{
		title: 'Intro',
		path: '/docs/v1/intro',
		section: 'Start',
		order: 1,
		version: 'v1',
		sourcePath: 'archive/v1/docs/intro/+page.md',
		toc: [{ id: 'old', title: 'Old', depth: 2 }]
	}
];

const versions = resolveVersions(
	{ current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1' }] },
	'/docs',
	content
);

const resolve = (pathname: string, over: Partial<Parameters<typeof resolveDocsPage>[0]> = {}) =>
	resolveDocsPage({
		content,
		versions,
		pathname,
		editUrl: 'https://github.com/o/r/edit/main',
		siteTitle: 'My Docs',
		...over
	});

describe('resolveDocsPage: pathname', () => {
	it('normalizes a trailing slash before matching content', () => {
		const view = resolve('/docs/intro/');
		expect(view.pathname).toBe('/docs/intro');
		expect(view.entry?.title).toBe('Intro');
	});
});

describe('resolveDocsPage: active version', () => {
	it('resolves the version owning the page', () => {
		expect(resolve('/docs/guide').activeVersionId).toBe('v2');
		expect(resolve('/docs/v1/intro').activeVersionId).toBe('v1');
	});

	it('falls back to the current version off the docs tree', () => {
		const view = resolve('/');
		expect(view.activeVersionId).toBe('v2');
		expect(view.isArchived).toBe(false);
		expect(view.scopedContent.map((item) => item.path)).toEqual([
			'/docs/intro',
			'/docs/guide',
			'/docs/middleware'
		]);
	});

	it('marks an archived page as archived, and exposes the current version alongside', () => {
		const view = resolve('/docs/v1/intro');
		expect(view.isArchived).toBe(true);
		expect(view.activeVersion?.id).toBe('v1');
		expect(view.currentVersion?.id).toBe('v2');
	});

	it('leaves the active version undefined on an unversioned site', () => {
		const view = resolve('/docs/intro', { versions: [] });
		expect(view.activeVersionId).toBeUndefined();
		expect(view.activeVersion).toBeUndefined();
		expect(view.currentVersion).toBeUndefined();
		expect(view.isArchived).toBe(false);
		// No version to scope to, so every page stays in the tree.
		expect(view.scopedContent).toBe(content);
	});
});

describe('resolveDocsPage: entry', () => {
	it('resolves from the scoped content, not the unscoped index', () => {
		// Unreachable in production (archive URLs are prefixed, so paths are
		// unique), but it pins which collection the lookup reads.
		const shadowed: DocsContentItem[] = [
			{
				title: 'Ghost',
				path: '/docs/intro',
				version: 'v1',
				toc: [{ id: 'ghost', title: 'Ghost', depth: 2 }]
			},
			...content
		];
		const view = resolve('/docs/intro', { content: shadowed });
		expect(view.entry?.title).toBe('Intro');
		expect(view.toc).toEqual([{ id: 'why', title: 'Why', depth: 2 }]);
	});

	it('resolves from the scoped content on an archived path too', () => {
		const shadowed: DocsContentItem[] = [
			{ title: 'Ghost', path: '/docs/v1/intro', version: 'v2' },
			...content
		];
		const view = resolve('/docs/v1/intro', { content: shadowed });
		expect(view.entry?.title).toBe('Intro');
		expect(view.entry?.version).toBe('v1');
	});

	it('is undefined for a page outside the content index', () => {
		const view = resolve('/');
		expect(view.entry).toBeUndefined();
		expect(view.toc).toEqual([]);
		expect(view.readingMinutes).toBeUndefined();
		expect(view.lastUpdated).toBeUndefined();
	});
});

describe('resolveDocsPage: toc', () => {
	it('comes from the resolved entry', () => {
		expect(resolve('/docs/v1/intro').toc).toEqual([{ id: 'old', title: 'Old', depth: 2 }]);
	});

	it('is an empty list when the entry extracted no headings', () => {
		expect(resolve('/docs/guide').toc).toEqual([]);
	});
});

describe('resolveDocsPage: editHref', () => {
	it('joins the edit base to the page source, collapsing a trailing slash', () => {
		expect(resolve('/docs/intro').editHref).toBe(
			'https://github.com/o/r/edit/main/src/routes/docs/intro/+page.md'
		);
		expect(resolve('/docs/intro', { editUrl: 'https://github.com/o/r/edit/main/' }).editHref).toBe(
			'https://github.com/o/r/edit/main/src/routes/docs/intro/+page.md'
		);
	});

	it('is suppressed on an archived page, which is frozen', () => {
		expect(resolve('/docs/v1/intro').entry?.sourcePath).toBeTruthy();
		expect(resolve('/docs/v1/intro').editHref).toBeUndefined();
	});

	it('is undefined without an edit base or a known source file', () => {
		expect(resolve('/docs/intro', { editUrl: undefined }).editHref).toBeUndefined();
		expect(resolve('/docs/guide').editHref).toBeUndefined();
	});
});

describe('resolveDocsPage: lastUpdated', () => {
	it('parses the entry stamp to a Date', () => {
		expect(resolve('/docs/intro').lastUpdated?.toISOString()).toBe('2026-07-01T10:00:00.000Z');
	});

	it('resolves an unparseable stamp to undefined', () => {
		const view = resolve('/docs/intro', {
			content: [{ ...content[0], lastUpdated: 'not-a-date' }]
		});
		expect(view.lastUpdated).toBeUndefined();
	});
});

describe('resolveDocsPage: readingMinutes', () => {
	it('passes the entry estimate through unformatted', () => {
		expect(resolve('/docs/intro').readingMinutes).toBe(4);
		expect(resolve('/docs/guide').readingMinutes).toBeUndefined();
	});
});

describe('resolveDocsPage: prev and next', () => {
	it('pages through the flattened sidebar order', () => {
		const view = resolve('/docs/guide');
		expect(view.prev).toEqual({ title: 'Intro', url: '/docs/intro' });
		expect(view.next).toEqual({ title: 'Middleware', url: '/docs/middleware' });
	});

	it('has no prev on the first page and no next on the last', () => {
		expect(resolve('/docs/intro').prev).toBeUndefined();
		expect(resolve('/docs/intro').next).toEqual({ title: 'Guide', url: '/docs/guide' });
		expect(resolve('/docs/middleware').next).toBeUndefined();
		expect(resolve('/docs/middleware').prev).toEqual({ title: 'Guide', url: '/docs/guide' });
	});

	it('has neither off the nav tree', () => {
		expect(resolve('/').prev).toBeUndefined();
		expect(resolve('/').next).toBeUndefined();
	});

	it('scopes paging to the active version', () => {
		const view = resolve('/docs/v1/intro');
		expect(view.prev).toBeUndefined();
		expect(view.next).toBeUndefined();
	});
});

describe('resolveDocsPage: title', () => {
	it('is the page title from the nav', () => {
		expect(resolve('/docs/middleware').title).toBe('Middleware');
	});

	it('falls back to the site title off the nav tree', () => {
		expect(resolve('/').title).toBe('My Docs');
	});
});

describe('resolveDocsPage: breadcrumbs', () => {
	it('trails the group path, then the page', () => {
		expect(resolve('/docs/middleware').breadcrumbs).toEqual(['Guides', 'Advanced', 'Middleware']);
	});

	it('is the group and the page for a top-level page', () => {
		expect(resolve('/docs/intro').breadcrumbs).toEqual(['Start', 'Intro']);
	});

	it('is empty off the nav tree', () => {
		expect(resolve('/').breadcrumbs).toEqual([]);
	});
});

describe('resolveDocsPage: nav', () => {
	it('is built from the scoped content, so an archive shows only its own pages', () => {
		expect(resolve('/docs/v1/intro').nav).toEqual([
			{ title: 'Start', items: [{ title: 'Intro', url: '/docs/v1/intro' }] }
		]);
	});
});
