import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { componentName, createPropsExtractor } from './extract.js';

const root = path.resolve(import.meta.dirname, '../../../..');
const fixture = (name: string) => path.join(import.meta.dirname, '_fixtures', `${name}.svelte`);
const extractor = createPropsExtractor({ root });
const extract = (name: string) => extractor.extract(fixture(name));

// The first read builds a TypeScript program, which takes seconds on a cold,
// instrumented (coverage) run.
const COLD = { timeout: 60_000 };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-props-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('createPropsExtractor', COLD, () => {
	it('reads types, defaults, requiredness and descriptions', async () => {
		const { props, warnings } = await extract('notice');
		expect(warnings).toEqual([]);
		expect(props.name).toBe('Notice');
		const byName = Object.fromEntries(props.props.map((p) => [p.name, p]));

		// An imported alias of literals shows its resolved union.
		expect(byName.tone).toEqual({
			name: 'tone',
			type: "'neutral' | 'info' | 'danger'",
			default: "'neutral'",
			required: false,
			bindable: false,
			description: 'Visual intent. See <a href="/docs/tones">tones</a> and <code>Tone</code>.',
			control: { kind: 'options', options: ['neutral', 'info', 'danger'] },
			literalDefault: 'neutral'
		});
		expect(byName.title).toMatchObject({ type: 'string', required: true });
		expect(byName.items).toMatchObject({ type: 'Item[]', default: '[]', required: false });
		expect(byName.dismissible).toMatchObject({ type: 'boolean', default: 'false' });
		expect(byName.onclose.type).toBe("(reason: 'button' | 'timeout') => void");
		expect(byName.children).toMatchObject({ type: 'Snippet', required: true });
	});

	it('derives a playground control and starting value from each type', async () => {
		const { props, warnings } = await extract('controls');
		expect(warnings).toEqual([]);
		const pick = ({
			control,
			literalDefault
		}: {
			control?: unknown;
			literalDefault?: unknown;
		}) => ({
			control,
			literalDefault
		});
		const byName = Object.fromEntries(props.props.map((p) => [p.name, pick(p)]));
		expect(byName).toEqual({
			tone: {
				control: { kind: 'options', options: ['neutral', 'info', 'danger'] },
				literalDefault: 'info'
			},
			// A template literal without expressions is still a literal.
			label: { control: { kind: 'text' }, literalDefault: 'Hello' },
			count: { control: { kind: 'number' }, literalDefault: -1 },
			step: { control: { kind: 'options', options: [1, 2, 3] }, literalDefault: 2 },
			// A $bindable() fallback is a default like any other.
			open: { control: { kind: 'boolean' }, literalDefault: false },
			// A computed default leaves the component to apply it.
			id: { control: { kind: 'text' }, literalDefault: undefined },
			// A cast is not a literal, so it starts unset too.
			size: { control: { kind: 'options', options: ['sm', 'lg'] }, literalDefault: undefined },
			// `null` only makes it unsettable.
			mode: { control: { kind: 'options', options: ['a', 'b'] }, literalDefault: undefined },
			value: { control: undefined, literalDefault: undefined },
			data: { control: undefined, literalDefault: undefined },
			onpick: { control: undefined, literalDefault: undefined },
			// Deprecated props stay out of the playground.
			old: { control: undefined, literalDefault: undefined },
			children: { control: undefined, literalDefault: undefined }
		});
	});

	it('keeps declaration order and honours JSDoc tags', async () => {
		const { props } = await extract('notice');
		const names = props.props.map((p) => p.name);
		expect(names).toEqual([
			'tone',
			'title',
			'items',
			'dismissible',
			'size',
			'onclose',
			'legacy',
			'children'
		]);
		// @internal hides `secret`; @default wins over the destructured default.
		expect(names).not.toContain('secret');
		expect(props.props.find((p) => p.name === 'size')?.default).toBe('2 (medium)');
		expect(props.props.find((p) => p.name === 'legacy')?.deprecated).toBe(
			'Use <code>title</code>.'
		);
	});

	it('handles generics, $bindable() and inherited element attributes', async () => {
		const { props } = await extract('select');
		expect(props.typeParameters).toEqual(['T', 'U']);
		expect(props.props).toEqual([
			expect.objectContaining({ name: 'options', type: 'T[]', required: true }),
			expect.objectContaining({ name: 'value', type: 'T', bindable: true, required: false }),
			expect.objectContaining({ name: 'option', type: 'Snippet<[T, U]>' })
		]);
		// Hundreds of <a> attributes collapse to one group.
		expect(props.inherited).toEqual([{ kind: 'element', label: 'a' }]);
	});

	it('finds inherited attributes on an extended interface', async () => {
		const { props } = await extract('button');
		expect(props.props.map((p) => p.name)).toEqual(['loading']);
		expect(props.inherited).toEqual([{ kind: 'element', label: 'button' }]);
	});

	it('resolves import aliases and other .svelte components', async () => {
		const { props, warnings } = await extract('aliased');
		expect(warnings).toEqual([]);
		expect(props.props).toEqual([
			expect.objectContaining({ name: 'tone', type: "'neutral' | 'info' | 'danger'" }),
			expect.objectContaining({ name: 'loading', type: 'boolean' })
		]);
	});

	it('keeps a library alias by name but expands a local one', async () => {
		const { props } = await extract('library-types');
		expect(props.props.map((p) => [p.name, p.type])).toEqual([
			['class', 'ClassValue'],
			['tone', "'neutral' | 'info' | 'danger'"]
		]);
	});

	it('watches the files a component imports', async () => {
		const { watchFiles } = await extract('notice');
		expect(watchFiles).toEqual([
			fixture('notice'),
			path.join(import.meta.dirname, '_fixtures', 'types.ts')
		]);
	});

	it('shows untyped props by name, with a warning', async () => {
		const { props, warnings } = await extract('untyped');
		expect(props.props).toEqual([
			{ name: 'label', required: false, bindable: false },
			{ name: 'count', default: '0', required: false, bindable: true },
			{ name: 'aria-label', default: "'x'", required: false, bindable: false }
		]);
		expect(warnings).toEqual([expect.stringContaining('untyped.svelte: `$props()` has no type')]);
	});

	it('warns when a component has no $props()', async () => {
		const { props, warnings } = await extract('static');
		expect(props.props).toEqual([]);
		expect(warnings).toEqual([expect.stringContaining('no `$props()` found')]);
	});

	it('warns instead of throwing on a component that does not parse', async () => {
		const file = path.join(tmp, 'broken.svelte');
		fs.writeFileSync(file, '<script lang="ts">let {</script>');
		const { props, warnings } = await extractor.extract(file);
		expect(props.props).toEqual([]);
		expect(warnings).toEqual([expect.stringContaining('could not parse the component')]);
	});

	it('warns when pointed at a published package file', async () => {
		const dir = path.join(tmp, 'node_modules', 'lib');
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, 'thing.svelte');
		fs.writeFileSync(file, '<script>\n\tlet { a } = $props();\n</script>\n');
		const { warnings } = await extractor.extract(file);
		expect(warnings[0]).toContain('published package file');
	});

	it('marks only the call that extracted a result as fresh', async () => {
		const file = path.join(tmp, 'fresh.svelte');
		fs.writeFileSync(file, '<script>\n\tlet { a } = $props();\n</script>\n');
		const fresh = createPropsExtractor({ root });

		const [first, concurrent] = await Promise.all([fresh.extract(file), fresh.extract(file)]);
		const later = await fresh.extract(file);

		expect([first.fresh, concurrent.fresh, later.fresh]).toEqual([true, false, false]);
		expect(concurrent.props).toBe(first.props);
		expect(later.props).toBe(first.props);
	});

	it('picks up an edit made while the component was being extracted', async () => {
		const file = path.join(tmp, 'racing.svelte');
		fs.writeFileSync(file, '<script>\n\tlet { a } = $props();\n</script>\n');
		const racing = createPropsExtractor({ root });

		// The file is read as extraction starts; edit it before that one finishes.
		const first = racing.extract(file);
		fs.writeFileSync(file, '<script>\n\tlet { a, b } = $props();\n</script>\n');
		const later = new Date(Date.now() + 5000);
		fs.utimesSync(file, later, later);
		const second = await racing.extract(file);

		expect((await first).props.props.map((p) => p.name)).toEqual(['a']);
		expect(second.fresh).toBe(true);
		expect(second.props.props.map((p) => p.name)).toEqual(['a', 'b']);
		expect((await racing.extract(file)).fresh).toBe(false);
	});

	it('picks up edits to a component', async () => {
		const file = path.join(tmp, 'live.svelte');
		const write = (type: string) =>
			fs.writeFileSync(
				file,
				`<script lang="ts">\n\tlet { a }: { a: ${type} } = $props();\n</script>\n`
			);
		write('string');
		expect((await extractor.extract(file)).props.props[0].type).toBe('string');
		write('number');
		// mtime resolution can be coarse; force a distinct timestamp.
		const later = new Date(Date.now() + 5000);
		fs.utimesSync(file, later, later);
		expect((await extractor.extract(file)).props.props[0].type).toBe('number');
	});
});

describe('createPropsExtractor without TypeScript', COLD, () => {
	it('falls back to names and defaults, with an install hint', async () => {
		vi.resetModules();
		vi.doMock('typescript', () => {
			throw new Error('Cannot find module');
		});
		const { createPropsExtractor: fresh } = await import('./extract.js');
		const { props, warnings } = await fresh({ root }).extract(fixture('notice'));
		vi.doUnmock('typescript');
		expect(warnings).toEqual([expect.stringContaining('npm i -D typescript svelte2tsx')]);
		expect(props.props.find((p) => p.name === 'tone')).toEqual({
			name: 'tone',
			default: "'neutral'",
			required: false,
			bindable: false
		});
	});
});

describe('createPropsExtractor when TypeScript itself fails', COLD, () => {
	it('warns and degrades instead of hanging the build', async () => {
		vi.resetModules();
		vi.doMock('./typescript.js', async (importOriginal) => ({
			...(await importOriginal<typeof import('./typescript.js')>()),
			createPropsTypeChecker: () => {
				throw new Error('broken tsconfig');
			}
		}));
		const { createPropsExtractor: fresh } = await import('./extract.js');
		const { props, warnings } = await fresh({ root }).extract(fixture('notice'));
		vi.doUnmock('./typescript.js');
		expect(warnings).toEqual([expect.stringContaining('broken tsconfig')]);
		expect(props.props.find((p) => p.name === 'title')).toEqual({
			name: 'title',
			required: false,
			bindable: false
		});
	});
});

describe('componentName', () => {
	it('derives a PascalCase name from the file', () => {
		expect(componentName('/x/file-tree-item.svelte')).toBe('FileTreeItem');
		expect(componentName('/x/Badge.svelte')).toBe('Badge');
		expect(componentName('/x/my_thing.svelte')).toBe('MyThing');
	});
});
