import { describe, expect, it } from 'vitest';
import {
	boundaryCrossings,
	rewriteDocsLinks,
	freezeLastUpdated,
	isInheritedRouteFile
} from './archive.js';

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

describe('boundaryCrossings', () => {
	/** A page whose script block holds `code`, at `pageDir` under the docs root. */
	const crossings = (code: string, pageDir = '') =>
		boundaryCrossings(`---\ntitle: X\n---\n\n<script>\n\t${code}\n</script>\n\nProse.\n`, pageDir);

	it('reports an import from $lib', () => {
		expect(crossings("import Counter from '$lib/examples/counter.svelte';")).toEqual([
			'$lib/examples/counter.svelte'
		]);
	});

	it('reports a bare npm specifier', () => {
		expect(crossings("import Rocket from '@lucide/svelte/icons/rocket';")).toEqual([
			'@lucide/svelte/icons/rocket'
		]);
	});

	// The expected shape for an archived page, and covered by the stability
	// promise rather than by this notice.
	it('does not report the library or one of its subpaths', () => {
		const code = [
			"import { Callout } from 'svelte-docsmith';",
			"import { docs } from 'svelte-docsmith/content';"
		].join('\n\t');
		expect(crossings(code)).toEqual([]);
	});

	// Archiving copies every file under the docs root, so these are frozen too.
	it('does not report a relative import that stays inside the docs root', () => {
		expect(crossings("import Demo from './demo.svelte';")).toEqual([]);
		expect(crossings("import Demo from '../shared/demo.svelte';", 'guides/nested')).toEqual([]);
	});

	it('reports a relative import that climbs out of the docs root', () => {
		expect(crossings("import Demo from '../../lib/demo.svelte';", 'guides')).toEqual([
			'../../lib/demo.svelte'
		]);
		expect(crossings("import Demo from '../demo.svelte';")).toEqual(['../demo.svelte']);
	});

	it('reads side-effect, dynamic, type-only and multi-line imports', () => {
		expect(crossings("import '$lib/styles.css';")).toEqual(['$lib/styles.css']);
		expect(crossings("const m = await import('$lib/demo.svelte');")).toEqual(['$lib/demo.svelte']);
		expect(crossings("import type { Props } from '$lib/types';")).toEqual(['$lib/types']);
		expect(crossings("import {\n\t\tone,\n\t\ttwo\n\t} from '$lib/pair';")).toEqual(['$lib/pair']);
	});

	// A page documenting an import is not performing one.
	it('ignores imports inside fenced code', () => {
		const source = [
			'---',
			'title: X',
			'---',
			'',
			'```svelte',
			'<script>',
			"\timport Counter from '$lib/examples/counter.svelte';",
			'</script>',
			'```'
		].join('\n');
		expect(boundaryCrossings(source, '')).toEqual([]);
	});

	it('is empty for a page with no script block', () => {
		expect(boundaryCrossings('---\ntitle: X\n---\n\nJust prose.\n', '')).toEqual([]);
	});

	it('reports each specifier once', () => {
		const code = ["import a from '$lib/x';", "import b from '$lib/x';"].join('\n\t');
		expect(crossings(code)).toEqual(['$lib/x']);
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
