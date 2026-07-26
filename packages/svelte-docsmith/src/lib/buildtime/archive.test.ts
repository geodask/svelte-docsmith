import { describe, expect, it } from 'vitest';
import { rewriteDocsLinks, freezeLastUpdated, isInheritedRouteFile } from './archive.js';

const rewrite = (text: string, archivedIds: string[] = ['v1']) =>
	rewriteDocsLinks(text, { docsBase: '/docs', versionId: 'v2', archivedIds });

describe('rewriteDocsLinks', () => {
	it('prefixes a markdown link into the archive', () => {
		expect(rewrite('see [x](/docs/theming)')).toBe('see [x](/docs/v2/theming)');
	});

	it('prefixes the docs root itself', () => {
		expect(rewrite('see [x](/docs)')).toBe('see [x](/docs/v2)');
	});

	it('keeps anchors and query strings attached', () => {
		expect(rewrite('[x](/docs/theming#setup)')).toBe('[x](/docs/v2/theming#setup)');
		expect(rewrite('[x](/docs/theming?tab=a)')).toBe('[x](/docs/v2/theming?tab=a)');
	});

	it('handles href attributes in either quote style', () => {
		expect(rewrite('<a href="/docs/theming">')).toBe('<a href="/docs/v2/theming">');
		expect(rewrite("<a href='/docs/theming'>")).toBe("<a href='/docs/v2/theming'>");
	});

	it('handles reference-style link definitions', () => {
		expect(rewrite('[ref]: /docs/theming')).toBe('[ref]: /docs/v2/theming');
	});

	it('respects the segment boundary', () => {
		expect(rewrite('[x](/docsmith)')).toBe('[x](/docsmith)');
	});

	it('leaves links that already point into an existing archive', () => {
		expect(rewrite('[x](/docs/v1/theming)')).toBe('[x](/docs/v1/theming)');
	});

	it('never double-prefixes a link already pointing at the archive being created', () => {
		expect(rewrite('[x](/docs/v2/theming)')).toBe('[x](/docs/v2/theming)');
	});

	it('leaves links inside a plain fenced block', () => {
		expect(rewrite('```\n[x](/docs/theming)\n```')).toBe('```\n[x](/docs/theming)\n```');
	});

	it('leaves links inside an indented fence', () => {
		const source = '- item\n  ```svelte\n  [x](/docs/theming)\n  ```\n';
		expect(rewrite(source)).toBe(source);
	});

	it('leaves links inside a tilde fence', () => {
		const source = '~~~\n[x](/docs/theming)\n~~~\n';
		expect(rewrite(source)).toBe(source);
	});

	it('rewrites prose that follows a closed fence', () => {
		expect(rewrite('```\n[a](/docs/x)\n```\n[b](/docs/y)')).toBe(
			'```\n[a](/docs/x)\n```\n[b](/docs/v2/y)'
		);
	});
});

// The fence scanner these link rewrites run through is covered in
// `markdown-source.test.ts`, which owns the rule.

describe('freezeLastUpdated', () => {
	it('inserts the date into existing frontmatter', () => {
		expect(freezeLastUpdated('---\ntitle: X\n---\nbody', '2026-03-04')).toBe(
			"---\ntitle: X\nlastUpdated: '2026-03-04'\n---\nbody"
		);
	});

	it('leaves an existing lastUpdated alone', () => {
		const source = "---\ntitle: X\nlastUpdated: '2020-01-01'\n---\nbody";
		expect(freezeLastUpdated(source, '2026-03-04')).toBe(source);
	});

	it('is a no-op without frontmatter or without a date', () => {
		expect(freezeLastUpdated('body', '2026-03-04')).toBe('body');
		expect(freezeLastUpdated('---\ntitle: X\n---\nbody', undefined)).toBe(
			'---\ntitle: X\n---\nbody'
		);
	});
});

describe('isInheritedRouteFile', () => {
	it('matches the layouts and error pages an archive inherits', () => {
		expect(isInheritedRouteFile('+layout.svelte')).toBe(true);
		expect(isInheritedRouteFile('+layout.ts')).toBe(true);
		expect(isInheritedRouteFile('+error.svelte')).toBe(true);
	});

	it('does not match pages', () => {
		expect(isInheritedRouteFile('+page.md')).toBe(false);
		expect(isInheritedRouteFile('+page.svelte')).toBe(false);
	});
});
