import { describe, expect, it, vi } from 'vitest';
import { docsmith, type DocsmithPreprocessOptions } from './preprocess.js';

type MarkupResult = { code: string } | void;
type Markup = (input: { content: string; filename: string }) => Promise<MarkupResult>;

/** Run the docsmith preprocessor's markup step over a markdown string. */
async function render(content: string, options?: DocsmithPreprocessOptions): Promise<string> {
	const markup = docsmith(options).markup as unknown as Markup;
	const result = await markup({ content, filename: 'src/routes/docs/x.md' });
	if (!result) throw new Error('preprocessor returned nothing');
	return result.code;
}

describe('docsmith preprocessor', () => {
	it('highlights code fences with dual light/dark Shiki themes', async () => {
		const code = await render('```js\nconst a = 1;\n```');
		expect(code).toContain('--shiki-dark');
		expect(code).toContain('shiki');
	});

	it('renders fences through the packaged <Components.pre> by default', async () => {
		const code = await render('```js\nconst a = 1;\n```');
		expect(code).toContain('<Components.pre>');
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
		expect(code).toContain('<Components.pre>');
		expect(code).toContain('nonsense');
	});

	it('keeps Shiki’s own <pre> when layout is false', async () => {
		const code = await render('```js\nconst a = 1;\n```', { layout: false });
		expect(code).not.toContain('<Components.pre>');
		expect(code).toContain('{@html');
	});

	it('renders a mermaid fence as a lazily-imported diagram, not code', async () => {
		const code = await render('```mermaid\nflowchart LR\n  A --> B\n```');
		expect(code).toContain("import('svelte-docsmith/mermaid')");
		expect(code).toContain('<Mermaid code={');
		// A server-rendered skeleton reserves the space while the diagram loads.
		expect(code).toContain('docsmith-mermaid-skeleton');
		// Not routed through Shiki / the code <pre>.
		expect(code).not.toContain('<Components.pre>');
		// The source is carried as a JSON-encoded string.
		expect(code).toContain('flowchart LR');
	});

	it('passes a fence title through to the pre component', async () => {
		const code = await render('```ts title="vite.config.ts"\nconst a = 1;\n```');
		expect(code).toContain('<Components.pre title="vite.config.ts">');
	});

	it('marks a fence that opts into line numbers, and leaves others alone', async () => {
		expect(await render('```ts showLineNumbers\nconst a = 1;\n```')).toContain(
			'<Components.pre lineNumbers>'
		);
		expect(await render('```ts\nconst a = 1;\n```')).toContain('<Components.pre>');
	});

	it('carries startLine so a lifted snippet numbers from the right place', async () => {
		const code = await render('```ts showLineNumbers startLine=12\nconst a = 1;\n```');
		expect(code).toContain('lineNumbers');
		expect(code).toContain('startLine={12}');
	});

	it('leaves a twoslash fence as a plain block when the option is off', async () => {
		const code = await render('```ts twoslash\nconst a: string = 1;\n```');
		expect(code).not.toContain('twoslash-hover');
		expect(code).toContain('<Components.pre>');
	});

	it('annotates a twoslash fence with hover types when enabled', async () => {
		const code = await render('```ts twoslash\nconst greeting = "hi";\n```', { twoslash: true });
		expect(code).toContain('twoslash-hover');
	});

	it('falls back to a plain block instead of failing the build on a bad snippet', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const code = await render('```ts twoslash\nconst n: number = "not a number";\n```', {
			twoslash: true
		});
		expect(code).toContain('<Components.pre>');
		expect(code).not.toContain('twoslash-hover');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('twoslash could not annotate'));
		warn.mockRestore();
	});

	it('does not run twoslash on a fence that did not ask for it', async () => {
		const code = await render('```ts\nconst n: number = "not a number";\n```', { twoslash: true });
		expect(code).toContain('<Components.pre>');
		expect(code).not.toContain('twoslash-hover');
	});
});
