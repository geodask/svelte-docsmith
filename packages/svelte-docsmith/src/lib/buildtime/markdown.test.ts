import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compile } from 'svelte/compiler';
import { describe, expect, it, vi } from 'vitest';
import { codeBlockRenderer } from './code-block.js';
import { markdownCompiler, type DocsmithMarkdownOptions } from './markdown.js';

/** Compile a markdown string as the plugin would, with one renderer per call. */
async function render(content: string, options: DocsmithMarkdownOptions = {}): Promise<string> {
	const renderer = codeBlockRenderer({
		langs: options.langs,
		lineNumbers: options.lineNumbers,
		twoslash: options.twoslash
	});
	const result = await markdownCompiler(options, renderer)(content, 'src/routes/docs/x.md');
	if (!result) throw new Error('compiler returned nothing');
	return result.code;
}

describe('markdown compiler', () => {
	it('highlights code fences with the theme’s code tokens', async () => {
		const code = await render('```js\nconst a = 1;\n```');
		expect(code).toContain('var(--code-token-keyword)');
		expect(code).not.toContain('--shiki-dark');
	});

	it('renders fences through the packaged <Components.pre> by default', async () => {
		const code = await render('```js\nconst a = 1;\n```');
		expect(code).toContain('<Components.pre language={"js"}>');
	});

	it('adds slug ids to headings (rehype-slug)', async () => {
		const code = await render('## Hello World');
		expect(code).toContain('id="hello-world"');
	});

	it('wraps sections with data-section-id (rehype-sectionize)', async () => {
		const code = await render('## First\n\ntext\n\n## Second\n\nmore');
		expect(code).toContain('data-section-id');
	});

	it('falls back to plain text for an unknown fence language (no throw)', async () => {
		const code = await render('```made-up-lang\nnonsense\n```');
		expect(code).toContain('<Components.pre language={"made-up-lang"}>');
		expect(code).toContain('nonsense');
	});

	it('keeps Shiki’s own <pre> when layout is false', async () => {
		const code = await render('```js\nconst a = 1;\n```', { layout: false });
		expect(code).not.toContain('<Components.pre');
		expect(code).toContain('{@html');
	});

	it('renders a mermaid fence as a lazily-imported diagram, not code', async () => {
		const code = await render('```mermaid\nflowchart LR\n  A --> B\n```');
		expect(code).toContain("import('svelte-docsmith/mermaid')");
		expect(code).toContain('<Mermaid code={');
		// A server-rendered skeleton reserves the space while the diagram loads.
		expect(code).toContain('docsmith-mermaid-skeleton');
		// Not routed through Shiki / the code <pre>.
		expect(code).not.toContain('<Components.pre');
		// The source is carried as a JSON-encoded string.
		expect(code).toContain('flowchart LR');
	});

	it('passes a fence title through to the pre component', async () => {
		const code = await render('```ts title="vite.config.ts"\nconst a = 1;\n```');
		expect(code).toContain('<Components.pre language={"ts"} title={"vite.config.ts"}>');
	});

	it('compiles a page whose fence title has quotes and braces', async () => {
		const code = await render('```ts title=\'say "hi" to {name}.ts\'\nconst a = 1;\n```');
		const { js } = compile(code, { generate: 'server', filename: 'x.svelte' });
		// The title is a string, not an expression reading a `name` variable.
		expect(js.code).toContain('say \\"hi\\" to {name}.ts');
	});

	it('marks a fence that opts into line numbers, and leaves others alone', async () => {
		expect(await render('```ts showLineNumbers\nconst a = 1;\n```')).toContain(
			'<Components.pre language={"ts"} lineNumbers>'
		);
		expect(await render('```ts\nconst a = 1;\n```')).toContain('<Components.pre language={"ts"}>');
	});

	it('carries startLine so a lifted snippet numbers from the right place', async () => {
		const code = await render('```ts showLineNumbers startLine=12\nconst a = 1;\n```');
		expect(code).toContain('lineNumbers');
		expect(code).toContain('startLine={12}');
	});

	it('leaves a twoslash fence as a plain block when the option is off', async () => {
		const code = await render('```ts twoslash\nconst a: string = 1;\n```');
		expect(code).not.toContain('twoslash-hover');
		expect(code).toContain('<Components.pre language={"ts"}>');
	});

	// The tests below compile their snippet with TypeScript, which takes well
	// over vitest's 5s default the first time on a cold machine. The work is the
	// point of the feature, so give it room rather than trimming the assertion.
	it('annotates a twoslash fence with hover types when enabled', async () => {
		const code = await render('```ts twoslash\nconst greeting = "hi";\n```', { twoslash: true });
		expect(code).toContain('twoslash-hover');
	}, 60_000);

	it('falls back to a plain block instead of failing the build on a bad snippet', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const code = await render('```ts twoslash\nconst n: number = "not a number";\n```', {
			twoslash: true
		});
		expect(code).toContain('<Components.pre language={"ts"}>');
		expect(code).not.toContain('twoslash-hover');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('twoslash could not annotate'));
		warn.mockRestore();
	}, 60_000);

	it('does not run twoslash on a fence that did not ask for it', async () => {
		const code = await render('```ts\nconst n: number = "not a number";\n```', { twoslash: true });
		expect(code).toContain('<Components.pre language={"ts"}>');
		expect(code).not.toContain('twoslash-hover');
	}, 60_000);

	it('highlights lines given as a range in the fence meta', async () => {
		const code = await render('```ts {2-3}\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```');
		expect((code.match(/highlighted/g) ?? []).length).toBeGreaterThanOrEqual(2);
	});

	it('reaches a svelte markup line, where a comment marker cannot', async () => {
		// An HTML comment inside a template region is stripped without applying
		// anything, so the meta range is the only way to highlight one.
		const code = await render('```svelte {2}\n<DocsShell\n\tsearch={loader}\n>\n</DocsShell>\n```');
		expect(code).toContain('highlighted');
	});
});

describe('markdown compiler with outside paths', () => {
	const routesDir = path.resolve('/app/src/routes');
	const intro = path.join(routesDir, 'docs', 'intro', '+page.md');

	/** Compile `content` as the page at `/docs/intro`, with `/relative` as an outside path. */
	async function renderPage(
		content: string,
		options: DocsmithMarkdownOptions = {},
		filename = intro
	): Promise<string> {
		const renderer = codeBlockRenderer({});
		const compile = markdownCompiler(
			{ layout: false, ...options },
			renderer,
			['/relative'],
			routesDir
		);
		const result = await compile(content, filename);
		if (!result) throw new Error('compiler returned nothing');
		return result.code;
	}

	it('marks a markdown link to an outside path rel="external"', async () => {
		const code = await renderPage('See [the worker](/relative/x) and [this](/relative).');
		expect(code).toContain('<a href="/relative/x" rel="external">');
		expect(code).toContain('<a href="/relative" rel="external">');
	});

	it('marks a link with a query or fragment, and one written relative to the page', async () => {
		// `/docs/intro` is the page's URL, so `../relative/y` is `/relative/y`.
		const code = await renderPage('[a](/relative?x=1) [b](/relative#top) [c](../relative/y)');
		expect(code).toContain('<a href="/relative?x=1" rel="external">');
		expect(code).toContain('<a href="/relative#top" rel="external">');
		expect(code).toContain('<a href="../relative/y" rel="external">');
	});

	it('marks a raw <a> inline in a paragraph, keeping its existing rel', async () => {
		const code = await renderPage('Inline <a href="/relative" rel="noopener">raw</a> link.');
		expect(code).toContain('<a href="/relative" rel="noopener external">raw</a>');
	});

	it('marks raw <a> in an HTML block, whatever its quotes', async () => {
		const code = await renderPage(
			[
				'<div>',
				'  <a class="x" href=\'/relative/y\'>single</a>',
				'  <a href=/relative/z>bare</a>',
				'</div>',
				'',
				'<a href="/relative/w">alone</a>'
			].join('\n')
		);
		expect(code).toContain(`<a class="x" href='/relative/y' rel="external">single</a>`);
		expect(code).toContain('<a href=/relative/z rel="external">bare</a>');
		expect(code).toContain('<a href="/relative/w" rel="external">alone</a>');
	});

	it('adds external only once, to a link that already has it', async () => {
		const code = await renderPage('<a rel="external" href="/relative">raw</a>');
		expect(code).toContain('<a rel="external" href="/relative">raw</a>');
	});

	it('leaves links that are not under an outside path alone', async () => {
		const code = await renderPage(
			[
				'[a](/relatives) [b](/docs/relative) [c](https://x.dev/relative) [d](//x.dev/relative)',
				'',
				'<a href="/relatives">e</a> <a href={"/relative"}>f</a>',
				'',
				'`<a href="/relative">g</a>`'
			].join('\n')
		);
		expect(code).not.toContain('external');
	});

	it('never rewrites an <a> in a comment or a script or style body', async () => {
		const code = await renderPage(
			[
				'<!-- <a href="/relative">commented</a> -->',
				'',
				'<div>',
				'  <!-- <a href="/relative/x">commented too</a> -->',
				'  <style>a[href="/relative"] { color: red; } /* <a href="/relative"> */</style>',
				'</div>',
				'',
				'<div>',
				'  <script>const tag = \'<a href="/relative/y">\';</script>',
				'</div>'
			].join('\n')
		);
		expect(code).not.toContain('external');
	});

	it('marks a raw <a> exactly when the broken-link check reads its href', async () => {
		const code = await renderPage(
			[
				'<a href="/relative/{slug}">interpolated</a> <a href=/relative/{slug}>bare too</a>',
				'',
				'<a title="href=\'/relative\'">no href</a> <A HREF="/relative/u">loud</A>'
			].join('\n')
		);
		expect(code).toContain('<a href="/relative/{slug}">interpolated</a>');
		expect(code).toContain('<a href=/relative/{slug}>bare too</a>');
		expect(code).toContain(`<a title="href='/relative'">no href</a>`);
		expect(code).toContain('<A HREF="/relative/u" rel="external">loud</A>');
	});

	it('marks links before the author’s rehype plugins see them', async () => {
		type Node = { tagName?: string; properties?: { rel?: unknown }; children?: Node[] };
		const seen: unknown[] = [];
		const visit = (node: Node) => {
			if (node.tagName === 'a') seen.push(node.properties?.rel);
			node.children?.forEach(visit);
		};
		const spy = () => (tree: object) => visit(tree as Node);
		await renderPage('[a](/relative)', { rehypePlugins: [spy] });
		expect(seen).toEqual([['external']]);
	});

	it('marks a relative link to an outside path without percent-encoding it', async () => {
		// The broken-link check accepts this same link; see `links.test.ts`.
		const compile = markdownCompiler(
			{ layout: false },
			codeBlockRenderer({}),
			['/docs/café'],
			routesDir
		);
		const result = await compile('[a](./café/x) <a href="./café">b</a> [c](./cafe)', intro);
		// remark writes the markdown link's href encoded; the raw <a> keeps it as written.
		expect(result?.code).toContain('<a href="./caf%C3%A9/x" rel="external">');
		expect(result?.code).toContain('<a href="./café" rel="external">');
		expect(result?.code).toContain('<a href="./cafe">');
	});

	it('leaves relative links alone in a markdown file outside the routes root', async () => {
		// It has no URL of its own, so there is nothing to resolve them against.
		const code = await renderPage('[a](../relative)', {}, path.resolve('/app/src/lib/notes.md'));
		expect(code).not.toContain('external');
	});
});

/** A page file in a fresh temp folder, with `files` written next to it. */
function pageWith(files: string[]): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'docsmith-images-'));
	for (const file of files) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), '');
	}
	return path.join(dir, 'guide', '+page.md');
}

async function compilePage(content: string, file: string, options: DocsmithMarkdownOptions = {}) {
	const result = await markdownCompiler(options, codeBlockRenderer())(content, file);
	if (!result) throw new Error('compiler returned nothing');
	return result.code;
}

describe('markdown images', () => {
	it('draws an image standing alone as a figure through the layout, its title the caption', async () => {
		const code = await render('![A chart](/chart.png "Sales by month")');
		expect(code).toContain('<Components.img');
		expect(code).toContain('title="Sales by month"');
		expect(code).toContain('standalone="{true}"');
		// Lifted out of its paragraph: a <figure> can't sit inside a <p>.
		expect(code).not.toMatch(/<p>\s*<Components\.img/);
		expect(compile(code, { generate: 'server' }).warnings).toEqual([]);
	});

	it('keeps an image inside a sentence inline, in its paragraph', async () => {
		const code = await render('Press ![the key](/key.png) to start.');
		expect(code).toMatch(
			/<p>Press <Components\.img src="\/key\.png" alt="the key"><\/Components\.img>/
		);
		expect(code).not.toContain('standalone');
	});

	it('leaves images to a custom layout as they are', async () => {
		const code = await render('![A chart](/chart.png)', { layout: false });
		expect(code).toContain('<p><img src="/chart.png" alt="A chart"></p>');
	});

	it('imports an image next to the page, so Vite serves it', async () => {
		const file = pageWith(['guide/shot.png', 'shared/logo.svg']);
		const code = await compilePage('![Shot](./shot.png)\n\n![Logo](../shared/logo.svg)', file);
		expect(code).toContain('import __docsmith_image_0 from "./shot.png";');
		expect(code).toContain('import __docsmith_image_1 from "../shared/logo.svg";');
		expect(code).toContain('src="{__docsmith_image_0}"');
		expect(compile(code, { generate: 'server' }).warnings).toEqual([]);
	});

	it("adds the import to the page's own script, not its module script", async () => {
		const file = pageWith(['guide/shot.png']);
		const code = await compilePage(
			'<script module>\n\texport const x = 1;\n</script>\n\n<script lang="ts">\n\tlet a = 1;\n</script>\n\n![Shot](./shot.png)',
			file
		);
		expect(code).toMatch(/<script lang="ts">[^<]*import __docsmith_image_0 from "\.\/shot\.png";/);
		expect(code.match(/<script(?![^>]*module)[^>]*>/g)).toHaveLength(1);
	});

	it('fails the build for an image that is not there, naming the page and the path', async () => {
		const file = pageWith([]);
		await expect(compilePage('![Shot](./missing.png)', file)).rejects.toThrow(
			/guide\/\+page\.md: the image `\.\/missing\.png` is not there/
		);
	});

	it('leaves static files and full URLs alone', async () => {
		const file = pageWith([]);
		const code = await compilePage('![a](/a.png)\n\n![b](https://example.com/b.png)', file);
		expect(code).not.toContain('import __docsmith_image');
		expect(code).toContain('src="/a.png"');
		expect(code).toContain('src="https://example.com/b.png"');
	});
});

describe('install blocks', () => {
	it('draws a pkg fence as one tab per package manager, through the layout', async () => {
		const code = await render('```sh pkg\nnpm i -D svelte-docsmith\n```');
		expect(code).toContain('<Components.install tabs={[{"manager":"pnpm"');
		expect(code).toContain('pnpm\\u003c/span>');
		expect(code).toContain('language={"sh"}');
		expect(compile(code, { generate: 'server' }).warnings).toEqual([]);
	});

	it('falls back to the npm block for a layout without install blocks', async () => {
		const code = await render('```sh pkg\nnpm i a\n```');
		expect(code).toContain('{:else}<Components.pre language={"sh"}>');
		const plain = await render('```sh pkg\nnpm i a\n```', { layout: false });
		expect(plain).not.toContain('Components');
		expect(plain).not.toContain('pnpm');
	});
});

describe('math', () => {
	it('leaves dollars alone by default', async () => {
		const code = await render('It costs $5, or $x$ with tax.');
		expect(code).toContain('It costs $5, or $x$ with tax.');
		expect(code).not.toContain('<math');
	});

	it('writes formulas as MathML when turned on', async () => {
		const code = await render('Inline $x^2$ here.\n\n$$\n\\frac{a}{b}\n$$', { math: true });
		expect(code).toMatch(/Inline \{@html "\\u003cmath>/);
		expect(code).toContain(
			'<div class="docsmith-math-display">{@html "\\u003cmath display=\\"block\\"'
		);
	});

	it('keeps "$5 or $10" as text, as Pandoc does', async () => {
		const code = await render('Pick $5 or $10.', { math: true });
		expect(code).toContain('Pick $5 or $10.');
	});

	it('keeps braces and < in a formula away from Svelte', async () => {
		const code = await render('Then $\\frac{a}{b} < \\{c\\}$.', { math: true });
		const { warnings } = compile(code, { generate: 'server' });
		expect(warnings).toEqual([]);
		expect(code).not.toContain('{a}');
	});

	it('warns and shows the source of a formula it cannot read', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const code = await render('Bad $\\frac{a$ here.', { math: true });
		expect(code).toContain('docsmith-math-error');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not read the formula'));
		warn.mockRestore();
	});
});
