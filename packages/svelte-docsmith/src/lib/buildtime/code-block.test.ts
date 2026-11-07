import { compile, parse } from 'svelte/compiler';
import { describe, expect, it, vi } from 'vitest';
import {
	codeBlockMarkup,
	codeBlockRenderer,
	sourcePanelHtml,
	type CodeBlock
} from './code-block.js';

const render = codeBlockRenderer();

type Node = { type: string; name?: string; [key: string]: unknown };

/** Every node in a parsed Svelte template, depth first. */
function* nodes(node: unknown): Generator<Node> {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const child of node) yield* nodes(child);
		return;
	}
	const n = node as Node;
	if (typeof n.type === 'string') yield n;
	for (const [key, value] of Object.entries(n)) {
		if (key !== 'parent' && typeof value === 'object') yield* nodes(value);
	}
}

/** The value a literal `{expression}` evaluates to. */
function literalOf(expression: unknown): unknown {
	const e = expression as { type: string; value?: unknown };
	if (e.type !== 'Literal') throw new Error(`expected a literal, got ${e.type}`);
	return e.value;
}

/**
 * Read markup back the way Svelte will: the `Components.pre` attributes and the
 * `{@html}` string, as the values Svelte would hand them at runtime.
 */
function readBack(markup: string) {
	const ast = parse(markup, { modern: true });
	const all = [...nodes(ast.fragment)];
	const pre = all.find((n) => n.type === 'Component' && n.name === 'Components.pre');
	const attrs: Record<string, unknown> = {};
	for (const attr of (pre?.attributes ?? []) as Array<{ name: string; value: unknown }>) {
		const value = attr.value;
		attrs[attr.name] =
			value === true ? true : literalOf((value as { expression: unknown }).expression);
	}
	const html = all.find((n) => n.type === 'HtmlTag') as { expression: unknown } | undefined;
	return { pre: Boolean(pre), attrs, html: html ? literalOf(html.expression) : undefined };
}

const code = (block: CodeBlock) => {
	if (block.kind !== 'code') throw new Error('expected a code block');
	return block;
};

describe('codeBlockRenderer', () => {
	it('colours code with the theme’s tokens and keeps Shiki’s <pre>', async () => {
		const block = code(await render('const a = 1;', 'js'));
		expect(block.html).toMatch(/^<pre class="shiki/);
		expect(block.html).toContain('color:var(--code-token-keyword)');
		expect(block.html).toContain('background-color:var(--code-background)');
		// One render serves both colour modes: nothing to flip under `.dark`.
		expect(block.html).not.toContain('--shiki-dark');
		expect(block.lineNumbers).toBe(false);
		expect(block).not.toHaveProperty('title');
	});

	it('renders an exact Shiki pair dual when codeTheme names one', async () => {
		const paired = codeBlockRenderer({ codeTheme: { light: 'github-light', dark: 'github-dark' } });
		const block = code(await paired('const a = 1;', 'js'));
		expect(block.html).toContain('--shiki-dark');
		expect(block.html).not.toContain('var(--code-');
	});

	it('renders a mermaid fence as a diagram with its source untouched', async () => {
		expect(await render('flowchart LR\n  A --> B', 'mermaid')).toEqual({
			kind: 'diagram',
			code: 'flowchart LR\n  A --> B'
		});
	});

	it('falls back to plain text for an unknown or missing language', async () => {
		for (const lang of ['made-up-lang', undefined, null, '']) {
			const block = code(await render('nonsense', lang));
			expect(block.html).toContain('nonsense');
		}
	});

	it('reads the title and numbering from the fence meta', async () => {
		const block = code(await render('x', 'ts', 'title="a.ts" showLineNumbers startLine=12'));
		expect(block).toMatchObject({ title: 'a.ts', lineNumbers: true, startLine: 12 });
	});

	it('applies the site default unless the fence says otherwise', async () => {
		const numbered = codeBlockRenderer({ lineNumbers: true });
		expect(code(await numbered('x', 'ts')).lineNumbers).toBe(true);
		expect(code(await numbered('x', 'ts', 'noLineNumbers')).lineNumbers).toBe(false);
	});

	it('drops startLine when the lines are not numbered', async () => {
		const block = code(await render('x', 'ts', 'startLine=4 noLineNumbers'));
		expect(block.lineNumbers).toBe(false);
		expect(block).not.toHaveProperty('startLine');
	});

	it('highlights the lines the meta names', async () => {
		const block = code(await render('a\nb\nc', 'ts', '{2-3}'));
		expect((block.html.match(/highlighted/g) ?? []).length).toBe(2);
	});

	it('applies the notation transformers with the token theme', async () => {
		const block = code(
			await render('const a = 1; // [!code ++]\nconst b = 2; // [!code focus]', 'ts')
		);
		expect(block.html).toContain('diff add');
		expect(block.html).toContain('focused');
	});

	it('warns once the twoslash fallback kicks in, and still renders the block', async () => {
		const warn = vi.fn();
		const strict = codeBlockRenderer({ twoslash: true, warn });
		const block = code(await strict('const n: number = "no";', 'ts', 'twoslash'));
		expect(block.html).not.toContain('twoslash-hover');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('twoslash could not annotate'));
	}, 60_000);
});

describe('codeBlockMarkup', () => {
	const titles = [
		'vite.config.ts',
		'say "hi".ts',
		"it's.ts",
		'src/routes/[slug]/{id}.ts',
		'a `tick` ${b}',
		'</script><script>alert(1)</script>',
		'back\\slash'
	];

	it.each(titles)('carries the title %j through to the pre component unchanged', async (title) => {
		const block = code(await render('const a = 1;', 'ts'));
		const markup = codeBlockMarkup({ ...block, title }, { layout: true });
		expect(readBack(markup).attrs).toEqual({ title });
		// And Svelte compiles it, rather than failing the build over a quote.
		expect(() => compile(markup, { generate: 'server' })).not.toThrow();
	});

	it('round-trips code full of braces, backticks and quotes as the same HTML', async () => {
		const source = 'const t = `${a}` + "{b}" + \'</pre>\';\n\\n';
		const block = code(await render(source, 'ts'));
		const back = readBack(codeBlockMarkup(block, { layout: true }));
		// The pre component brings its own <pre>; the HTML inside is Shiki's.
		expect(block.html).toContain(back.html as string);
		expect(back.html).toMatch(/^<code>/);
	});

	it('marks numbering and the start line as attributes', async () => {
		const block = code(await render('x', 'ts', 'showLineNumbers startLine=12'));
		expect(readBack(codeBlockMarkup(block, { layout: true })).attrs).toEqual({
			lineNumbers: true,
			startLine: 12
		});
	});

	it('keeps Shiki’s own <pre> when there is no layout', async () => {
		const block = code(await render('const a = 1;', 'js'));
		const back = readBack(codeBlockMarkup(block, { layout: false }));
		expect(back.pre).toBe(false);
		expect(back.html).toBe(block.html);
	});

	it('lazy-loads a diagram with a skeleton and its source as a literal', () => {
		const source = 'flowchart LR\n  A["{x}"] --> B';
		const markup = codeBlockMarkup({ kind: 'diagram', code: source }, { layout: true });
		expect(markup).toContain("import('svelte-docsmith/mermaid')");
		expect(markup).toContain('docsmith-mermaid-skeleton');
		const ast = parse(markup, { modern: true });
		const mermaid = [...nodes(ast.fragment)].find(
			(n) => n.type === 'Component' && n.name === 'Mermaid'
		) as unknown as {
			attributes: Array<{ value: { expression: unknown } }>;
		};
		expect(literalOf(mermaid.attributes[0].value.expression)).toBe(source);
	});
});

describe('sourcePanelHtml', () => {
	it('strips Shiki’s own surface so the panel sits on the component background', async () => {
		const html = sourcePanelHtml(await render('<button>{count}</button>', 'svelte'));
		expect(html).toMatch(/^<pre class="shiki/);
		expect(html).toContain('count');
		expect(html).not.toContain('background-color');
		expect(html).not.toContain('--shiki-dark-bg');
	});

	it('refuses a diagram', () => {
		expect(() => sourcePanelHtml({ kind: 'diagram', code: 'x' })).toThrow();
	});
});
