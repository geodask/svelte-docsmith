import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { Plugin } from 'vite';
import { codeBlockRenderer } from '../../code-block.js';
import type { ExtractedProps } from '../../../core/extracted-props.js';
import { createPropsReader } from '../../props/reader.js';
import { DOC_IMPORT_KINDS, docImportReads, docImportsPlugin, type TagSite } from './index.js';
import { propsImport } from './props.js';
import { sourceImport } from './source.js';

// Plugin hooks are typed as ObjectHook unions; here they are plain functions,
// so cast to call them directly with a fake Rollup plugin context.
type ResolveId = (this: unknown, id: string, importer?: string) => Promise<string | undefined>;
type Load = (this: unknown, id: string) => Promise<string | undefined>;

const root = path.resolve(import.meta.dirname, '../../../../..');
const propsFixture = (name: string) =>
	path.resolve(import.meta.dirname, '../../props/_fixtures', `${name}.svelte`);
const deps = () => ({ render: codeBlockRenderer(), props: createPropsReader() });
const hook = () => ({ addWatchFile: vi.fn(), warn: vi.fn() });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-imports-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
const example = path.join(tmp, 'Example.svelte');
fs.writeFileSync(example, '<script>\n\tlet count = 0;\n</script>\n\n');

/**
 * Import `specifier` through the plugin as Vite would: resolve it (to `file`),
 * then load whatever id the plugin resolved it to.
 */
async function importThrough(plugin: Plugin, specifier: string, file: string) {
	const resolve = vi.fn().mockResolvedValue({ id: file });
	const id = await (plugin.resolveId as unknown as ResolveId).call({ resolve }, specifier, '/page');
	expect(resolve).toHaveBeenCalledWith(specifier.replace(/\?\w+$/, ''), '/page', {
		skipSelf: true
	});
	// vite-plugin-svelte must not take the virtual module for a component.
	expect(id).toBeDefined();
	expect(id).not.toMatch(/\.svelte$/);
	const ctx = hook();
	const out = await (plugin.load as unknown as Load).call(ctx, id!);
	return { out, ctx };
}

const defaultExport = (out: string | undefined) =>
	JSON.parse(
		String(out)
			.replace(/^export default /, '')
			.replace(/;$/, '')
	);

describe('doc imports plugin', () => {
	it('leaves other imports, and components that do not resolve, to Vite', async () => {
		const resolveId = docImportsPlugin(deps()).resolveId as unknown as ResolveId;
		const resolve = vi.fn().mockResolvedValue(null);
		expect(await resolveId.call({ resolve }, 'Foo.svelte', '/page')).toBeUndefined();
		expect(await resolveId.call({ resolve }, 'Foo.svelte?raw', '/page')).toBeUndefined();
		expect(await resolveId.call({ resolve }, 'Foo.ts?props', '/page')).toBeUndefined();
		expect(await resolveId.call({ resolve }, 'Missing.svelte?source', '/page')).toBeUndefined();
		expect(resolve).toHaveBeenCalledTimes(1);
	});

	it('ignores ids that are not doc import modules', async () => {
		const load = docImportsPlugin(deps()).load as unknown as Load;
		expect(await load.call(hook(), '/abs/Foo.svelte')).toBeUndefined();
		expect(await load.call(hook(), '\0svelte-docsmith:content')).toBeUndefined();
	});

	it('points the props reader at the Vite root', () => {
		const reader = { configure: vi.fn(), read: vi.fn() };
		const plugin = docImportsPlugin({ render: codeBlockRenderer(), props: reader });
		(plugin.configResolved as unknown as (c: { root: string }) => void)({ root: '/app' });
		expect(reader.configure).toHaveBeenCalledWith('/app');
	});
});

describe('?source', () => {
	it('loads as the highlighted file source and watches the file', async () => {
		const { out, ctx } = await importThrough(
			docImportsPlugin(deps()),
			'./Example.svelte?source',
			example
		);

		expect(ctx.addWatchFile).toHaveBeenCalledWith(example);
		expect(out).toMatch(/^export default /);
		expect(out).toContain('shiki');
		expect(out).toContain('count');
		// Shiki's own surface is stripped so the source sits on the component bg.
		expect(out).not.toContain('background-color');
		expect(out).not.toContain('--shiki-dark-bg');
	});

	it('fails the import when the example cannot be read', async () => {
		const missing = path.join(tmp, 'Missing.svelte');
		await expect(
			importThrough(docImportsPlugin(deps()), './Missing.svelte?source', missing)
		).rejects.toThrow(/ENOENT/);
	});

	it('reads the same source for agent markdown, or nothing when it is missing', async () => {
		expect(await sourceImport.read(example, hook(), deps())).toBe(
			'<script>\n\tlet count = 0;\n</script>'
		);
		expect(await sourceImport.read(path.join(tmp, 'Missing.svelte'), hook(), deps())).toBe(
			undefined
		);
	});

	it('writes a fenced svelte block, indented and fenced past any backticks inside', () => {
		const site: TagSite = { attributes: '', indent: '  ', level: 1 };
		expect(sourceImport.write('<p>hi</p>', site)).toBe('  ```svelte\n  <p>hi</p>\n  ```');
		expect(sourceImport.write('a\n\n````\nb', site)).toBe(
			'  `````svelte\n  a\n\n  ````\n  b\n  `````'
		);
	});
});

const BADGE: ExtractedProps = {
	name: 'Badge',
	typeParameters: [],
	props: [{ name: 'tone', type: "'a' | 'b'", required: false, bindable: false }],
	inherited: []
};

// The first load builds a TypeScript program: seconds on a cold coverage run.
describe('?props', { timeout: 60_000 }, () => {
	it('loads as the extracted props and watches what they were read from', async () => {
		const shared = deps();
		shared.props.configure(root);
		const { out, ctx } = await importThrough(
			docImportsPlugin(shared),
			'./notice.svelte?props',
			propsFixture('notice')
		);

		const props = defaultExport(out);
		expect(props.name).toBe('Notice');
		expect(props.props[0]).toMatchObject({ name: 'tone', type: "'neutral' | 'info' | 'danger'" });
		// The page side renders the JSDoc as HTML.
		expect(props.props[0].description).toContain('<a href="/docs/tones">');
		expect(ctx.addWatchFile).toHaveBeenCalledWith(propsFixture('notice'));
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.resolve(import.meta.dirname, '../../props/_fixtures/types.ts')
		);
		expect(ctx.warn).not.toHaveBeenCalled();
	});

	it('passes extraction problems on as warnings', async () => {
		const { ctx } = await importThrough(
			docImportsPlugin(deps()),
			'./static.svelte?props',
			propsFixture('static')
		);
		expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('no `$props()` found'));
	});

	it('reads the props with descriptions as markdown for agent markdown', async () => {
		const shared = deps();
		shared.props.configure(root);
		const props = await propsImport.read(propsFixture('notice'), hook(), shared);
		expect(props?.props[0].description).toContain('[tones](/docs/tones)');
	});

	it('writes a table under the next heading level, captioned by a literal title', () => {
		const at = (attributes: string, level: number): TagSite => ({ attributes, indent: '', level });
		const heading = (markdown: string) => markdown.split('\n')[0];
		expect(heading(propsImport.write(BADGE, at(' of={badge}', 2)))).toBe('### `Badge`');
		expect(heading(propsImport.write(BADGE, at(' of={badge} title="Badge.Root"', 2)))).toBe(
			'### `Badge.Root`'
		);
		expect(heading(propsImport.write(BADGE, at(" title={'Root'} of={badge}", 1)))).toBe(
			'## `Root`'
		);
		// Never past h6.
		expect(heading(propsImport.write(BADGE, at(' of={badge}', 6)))).toBe('###### `Badge`');
	});
});

describe('?props in agent markdown', () => {
	const at: TagSite = { attributes: ' of={props}', indent: '', level: 1 };

	it('writes fields after their row by path, naming the shape a union field belongs to', () => {
		const table = propsImport.write(
			{
				name: 'Popover',
				typeParameters: [],
				inherited: [],
				props: [
					{
						name: 'options',
						type: 'Options',
						required: false,
						bindable: false,
						fields: [
							{
								fields: [
									{
										name: 'placement',
										type: 'Placement',
										required: true,
										description: 'Where it sits.',
										fields: [
											{ fields: [{ name: 'side', type: "'top' | 'bottom'", required: true }] }
										]
									}
								]
							}
						]
					},
					{
						name: 'choice',
						type: 'Choice',
						required: false,
						bindable: false,
						fields: [
							{
								label: "kind: 'text'",
								fields: [{ name: 'placeholder', type: 'string', required: false }]
							},
							{
								label: "kind: 'number'",
								fields: [{ name: 'min', type: 'number', required: false }]
							}
						]
					}
				]
			},
			at
		);
		expect(table.split('\n').slice(2)).toEqual([
			'| Prop | Type | Default | Description |',
			'| --- | --- | --- | --- |',
			'| `options?` | `Options` |  |  |',
			'| `options.placement` | `Placement` |  | Where it sits. |',
			"| `options.placement.side` | `'top' \\| 'bottom'` |  |  |",
			'| `choice?` | `Choice` |  |  |',
			"| `choice.placeholder?` *(when kind: 'text')* | `string` |  |  |",
			"| `choice.min?` *(when kind: 'number')* | `number` |  |  |"
		]);
	});

	it("adds the component's since under the heading, and a column when a row has one", () => {
		const table = propsImport.write(
			{
				...BADGE,
				since: '0.4',
				props: [
					...BADGE.props,
					{
						name: 'compact',
						type: 'boolean',
						required: false,
						bindable: false,
						since: '0.6',
						fields: []
					}
				]
			},
			at
		);
		expect(table.split('\n')).toEqual([
			'## `Badge`',
			'',
			'Since 0.4',
			'',
			'| Prop | Type | Default | Description | Since |',
			'| --- | --- | --- | --- | --- |',
			"| `tone?` | `'a' \\| 'b'` |  |  |  |",
			'| `compact?` | `boolean` |  |  | 0.6 |'
		]);
		// No column without a since.
		expect(propsImport.write(BADGE, at)).not.toContain('Since');
	});
});

describe('DOC_IMPORT_KINDS', () => {
	it('gives every kind its own query and tag', () => {
		const queries = DOC_IMPORT_KINDS.map((kind) => kind.query);
		const tags = DOC_IMPORT_KINDS.map((kind) => kind.tag);
		expect(new Set(queries).size).toBe(queries.length);
		expect(new Set(tags).size).toBe(tags.length);
	});

	it('hands agent markdown one read per kind, through the hook', async () => {
		const reader = {
			configure: vi.fn(),
			read: vi.fn(async () => ({
				props: BADGE,
				markdown: BADGE,
				warnings: [],
				watchFiles: []
			}))
		};
		const ctx = hook();
		const reads = docImportReads({ render: codeBlockRenderer(), props: reader }, ctx);
		expect(Object.keys(reads).sort()).toEqual(['props', 'source']);
		expect(await reads.props('/abs/Badge.svelte')).toBe(BADGE);
		expect(reader.read).toHaveBeenCalledWith('/abs/Badge.svelte', ctx);
		expect(await reads.source(example)).toContain('let count');
	});
});
