import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ExtractedProp, ExtractedProps } from '#lib/core/extracted-props.js';
import { llmsIndex, type AgentMarkdownHost } from './agent-markdown.js';
import { toPage, type SourcePage } from './pages.js';

// Everything here runs against literal pages and a literal host: no docs root,
// no Vite and no TypeScript. `vite.test.ts` proves the host the plugin builds.

const routesDir = path.resolve('/app/src/routes');
const contentDir = path.join(routesDir, 'docs');
const libDir = path.resolve('/app/src/lib');
const options = { contentDir, routesDir };

/** A page as it would have been read from `<docs root>/<relDir>/+page.md`. */
function page(relDir: string, frontmatter: string, body = '# body'): SourcePage {
	return toPage(pageFile(relDir), `---\n${frontmatter}\n---\n\n${body}\n`);
}

const pageFile = (relDir: string) => path.join(contentDir, relDir, '+page.md');
const docsFile = (rel: string) => path.join(contentDir, rel);
const libFile = (rel: string) => path.join(libDir, rel);

/** What a literal host has: example sources and extracted props by file, and files that resolve but can't be read. */
type HostFiles = {
	sources?: Record<string, string>;
	props?: Record<string, ExtractedProps>;
	unreadable?: string[];
};

/**
 * A host over literal files. It resolves a specifier like Vite would, relative
 * to the importing page or through the `#lib` and `$lib` aliases, to a file it
 * has.
 */
function literalHost({ sources = {}, props = {}, unreadable = [] }: HostFiles = {}) {
	const known = new Set([...Object.keys(sources), ...Object.keys(props), ...unreadable]);
	return {
		resolve: vi.fn(async (specifier: string, importer: string) => {
			const alias = /^[#$]lib\//.exec(specifier);
			const file = alias
				? libFile(specifier.slice(alias[0].length))
				: path.resolve(path.dirname(importer), specifier);
			return known.has(file) ? file : undefined;
		}),
		watch: vi.fn(),
		warn: vi.fn(),
		source: vi.fn((file: string): string | undefined => sources[file]),
		props: vi.fn(async (file: string) => props[file] ?? extracted(path.basename(file, '.svelte')))
	} satisfies AgentMarkdownHost;
}

/** Each entry's agent markdown, by path. */
async function agentMarkdown(pages: SourcePage[], host: AgentMarkdownHost) {
	const docs = await llmsIndex(pages, options, host);
	return Object.fromEntries(docs.map((doc) => [doc.path, doc.content]));
}

/** A component's extracted props, as the host's `props` returns them. */
function extracted(name: string, rest: Partial<ExtractedProps> = {}): ExtractedProps {
	return { name, typeParameters: [], props: [], inherited: [], ...rest };
}

/** One extracted prop: optional and not bindable unless `rest` says so. */
function prop(name: string, rest: Partial<ExtractedProp> = {}): ExtractedProp {
	return { name, required: false, bindable: false, ...rest };
}

describe('llmsIndex', () => {
	it('carries each titled page with its markdown, setup blocks dropped and title prepended, sorted by path', async () => {
		const pages = [
			page('intro', 'title: Intro\ndraft: true', 'Hello.'),
			page(
				'guide/setup',
				'title: Setup\nsection: [Guide, Basics]\norder: 2\ndescription: Install it.',
				'<script>\n\timport X from "./x.svelte";\n</script>\n<style>.x { color: red; }</style>\n\n## Install\n\nRun `pnpm add x`.\n\n```bash\nnpm i x\n```\n\n<X />\n\n<style>\n\tp { color: red; }\n</style>'
			),
			page('untitled', 'description: no title', 'Ignored.')
		];

		expect(await llmsIndex(pages, options, literalHost())).toStrictEqual([
			{
				path: '/docs/guide/setup',
				title: 'Setup',
				section: ['Guide', 'Basics'],
				order: 2,
				description: 'Install it.',
				content: '# Setup\n\n## Install\n\nRun `pnpm add x`.\n\n```bash\nnpm i x\n```\n\n<X />',
				version: undefined
			},
			{
				path: '/docs/intro',
				title: 'Intro',
				section: undefined,
				order: undefined,
				description: undefined,
				content: '# Intro\n\nHello.',
				version: undefined
			}
		]);
	});

	it('keeps setup blocks inside code samples', async () => {
		const sample =
			"```svelte\n<script>\n\timport { Badge } from 'svelte-docsmith';\n</script>\n\n<Badge>New</Badge>\n\n<style>\n\tp { color: red; }\n</style>\n```";
		const pages = [
			page(
				'sample',
				'title: Sample',
				`<script>\n\timport X from "./x.svelte";\n</script>\n\nUse it:\n\n${sample}\n\n<style>\n\tp { color: blue; }\n</style>`
			)
		];

		expect(await agentMarkdown(pages, literalHost())).toEqual({
			'/docs/sample': `# Sample\n\nUse it:\n\n${sample}`
		});
	});

	it('tags each page with the version it belongs to, as the content index does', async () => {
		const pages = [page('intro', 'title: Now'), page('v1/intro', 'title: Then')];
		const versions = {
			current: { id: 'v2', label: 'v2' },
			archived: [{ id: 'v1', label: 'v1' }]
		};

		const docs = await llmsIndex(pages, { ...options, versions }, literalHost());

		expect(docs.map((doc) => [doc.path, doc.version])).toEqual([
			['/docs/intro', 'v2'],
			['/docs/v1/intro', 'v1']
		]);
	});

	it('reads nothing for a page left out of the index', async () => {
		const host = literalHost();
		const pages = [
			page(
				'untitled',
				'description: No title, so not indexed.',
				"<script>\n\timport gone from '#lib/gone.svelte?source';\n\timport goneProps from '#lib/gone.svelte?props';\n</script>\n\n<LiveExample source={gone} />"
			)
		];

		expect(await llmsIndex(pages, options, host)).toEqual([]);
		expect(host.resolve).not.toHaveBeenCalled();
		expect(host.props).not.toHaveBeenCalled();
		expect(host.warn).not.toHaveBeenCalled();
	});

	it("asks for every page's props at once, so the extractor can batch them", async () => {
		const pending: (() => void)[] = [];
		const host = {
			...literalHost({ unreadable: [libFile('a.svelte'), libFile('b.svelte')] }),
			props: vi.fn(
				(file: string) =>
					new Promise<ExtractedProps>((resolve) =>
						pending.push(() => resolve(extracted(path.basename(file, '.svelte'))))
					)
			)
		};
		const pages = ['a', 'b'].map((name) =>
			page(
				name,
				`title: ${name}`,
				`<script>\n\timport props from '$lib/${name}.svelte?props';\n</script>\n\n<PropsTable of={props} />`
			)
		);

		const docs = llmsIndex(pages, options, host);
		await vi.waitFor(() => expect(host.props).toHaveBeenCalledTimes(2));
		for (const resolve of pending) resolve();

		expect((await docs).map((doc) => doc.content)).toEqual([
			'# a\n\n## `a`\n\nNo props.',
			'# b\n\n## `b`\n\nNo props.'
		]);
	});
});

describe('agent markdown live examples', () => {
	const COUNTER =
		'<script>\n\tlet count = $state(0);\n</script>\n\n<button onclick={() => count++}>{count}</button>';

	it('writes a LiveExample as a fenced svelte block of the example file', async () => {
		const host = literalHost({ sources: { [docsFile('examples/counter.svelte')]: COUNTER } });
		const pages = [
			page(
				'examples',
				'title: Examples',
				"<script>\n\timport { LiveExample } from 'svelte-docsmith';\n\timport Counter from './counter.svelte';\n\timport counterSource from './counter.svelte?source';\n</script>\n\nClick it:\n\n<LiveExample source={counterSource}>\n\t<Counter />\n</LiveExample>\n\nAfter."
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/examples': `# Examples\n\nClick it:\n\n\`\`\`svelte\n${COUNTER}\n\`\`\`\n\nAfter.`
		});
		expect(host.warn).not.toHaveBeenCalled();
	});

	it('resolves each source import from its page, query stripped, and reads what it resolves to', async () => {
		const host = literalHost({
			sources: {
				[libFile('examples/hash.svelte')]: '<p>hash</p>',
				[libFile('dollar.svelte')]: '<p>dollar</p>'
			}
		});
		const pages = [
			page(
				'aliases',
				'title: Aliases',
				'<script>\n\timport hash from \'#lib/examples/hash.svelte?source\';\n\timport dollar from "$lib/dollar.svelte?source";\n</script>\n\n<LiveExample source={hash}><Hash /></LiveExample>\n\n<LiveExample {source} />\n\n<LiveExample source={dollar} />'
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/aliases':
				'# Aliases\n\n```svelte\n<p>hash</p>\n```\n\n<LiveExample {source} />\n\n```svelte\n<p>dollar</p>\n```'
		});
		expect(host.resolve).toHaveBeenCalledWith('#lib/examples/hash.svelte', pageFile('aliases'));
		expect(host.resolve).toHaveBeenCalledWith('$lib/dollar.svelte', pageFile('aliases'));
		expect(host.source).toHaveBeenCalledWith(libFile('examples/hash.svelte'));
	});

	it('keeps a LiveExample whose source import does not resolve, and warns with the page and specifier', async () => {
		const host = literalHost();
		const pages = [
			page(
				'broken',
				'title: Broken',
				"<script>\n\timport gone from '#lib/gone.svelte?source';\n</script>\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>"
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/broken': '# Broken\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>'
		});
		expect(host.watch).not.toHaveBeenCalled();
		expect(host.warn).toHaveBeenCalledTimes(1);
		expect(host.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/docs\/broken\/\+page\.md: could not read `#lib\/gone\.svelte\?source` for <LiveExample source=\{gone\}>/
			)
		);
	});

	it('keeps a LiveExample whose example resolves but cannot be read, watching it so creating it rebuilds', async () => {
		const example = docsFile('examples/counter.svelte');
		const host = literalHost({ unreadable: [example] });
		const pages = [
			page(
				'examples',
				'title: Examples',
				"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\n<LiveExample source={counterSource} />"
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/examples': '# Examples\n\n<LiveExample source={counterSource} />'
		});
		expect(host.watch).toHaveBeenCalledWith(example);
		expect(host.warn).toHaveBeenCalledTimes(1);
	});

	it('watches each example file it read, so editing one rebuilds the index', async () => {
		const example = docsFile('examples/counter.svelte');
		const host = literalHost({ sources: { [example]: COUNTER } });
		const pages = [
			page(
				'examples',
				'title: Examples',
				"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\n<LiveExample source={counterSource} />"
			)
		];

		await llmsIndex(pages, options, host);

		expect(host.watch).toHaveBeenCalledWith(example);
	});

	it('leaves LiveExamples in code samples and without a source import as written', async () => {
		const host = literalHost({ sources: { [docsFile('samples/counter.svelte')]: COUNTER } });
		const body =
			'```svelte\n<LiveExample source={counterSource}>\n\t<Counter />\n</LiveExample>\n```\n\n' +
			'<LiveExample source={html}>\n\t<b>x</b>\n</LiveExample>';
		const pages = [
			page(
				'samples',
				'title: Samples',
				"<script>\n\timport counterSource from './counter.svelte?source';\n\tconst html = '<b>x</b>';\n</script>\n\n" +
					body
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({ '/docs/samples': `# Samples\n\n${body}` });
		expect(host.warn).not.toHaveBeenCalled();
	});

	it('ignores doc imports written inside a code sample', async () => {
		const host = literalHost();
		const body =
			"```svelte\n<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n```";
		const pages = [page('sample', 'title: Sample', body)];

		expect(await agentMarkdown(pages, host)).toEqual({ '/docs/sample': `# Sample\n\n${body}` });
		expect(host.resolve).not.toHaveBeenCalled();
	});

	it('fences example code that itself contains a fence, at the indentation of the tag', async () => {
		const host = literalHost({
			sources: { [docsFile('nested/md.svelte')]: '<pre>```js\nx\n```</pre>' }
		});
		const pages = [
			page(
				'nested',
				'title: Nested',
				"<script>\n\timport md from './md.svelte?source';\n</script>\n\n- In a list:\n\n  <LiveExample source={md}>\n    <Md />\n  </LiveExample>"
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/nested':
				'# Nested\n\n- In a list:\n\n  ````svelte\n  <pre>```js\n  x\n  ```</pre>\n  ````'
		});
	});
});

describe('agent markdown props tables', () => {
	/** A page body whose `<script>` binds each `imports` name to a props import of `$lib/<file>`. */
	const propsPage = (imports: Record<string, string>, body: string) =>
		"<script>\n\timport { PropsTable } from 'svelte-docsmith';\n" +
		Object.entries(imports)
			.map(([local, file]) => `\timport ${local} from '$lib/${file}?props';\n`)
			.join('') +
		'</script>\n\n' +
		body;

	const NOTICE = extracted('Notice', {
		props: [
			prop('tone', {
				type: "'neutral' | 'info' | 'danger'",
				default: "'neutral'",
				description: 'Visual intent. See [tones](/docs/tones) and `Tone`.'
			}),
			prop('title', { type: 'string', required: true, description: 'Heading text.' }),
			prop('size', { type: 'number', default: '2 (medium)', description: 'Size step.' }),
			prop('onclose', {
				type: "(reason: 'button' | 'timeout') => void",
				description: 'Called after the notice closes.'
			}),
			prop('legacy', { type: 'string', deprecated: 'Use `title`.' }),
			prop('children', { type: 'Snippet', required: true })
		]
	});

	it('writes a generated props table as a heading and a markdown table, under the heading it sits in', async () => {
		const host = literalHost({ props: { [libFile('notice.svelte')]: NOTICE } });
		const pages = [
			page(
				'notice',
				'title: Notice',
				propsPage(
					{ noticeProps: 'notice.svelte' },
					'## API reference\n\n<PropsTable of={noticeProps} />\n\nAfter.'
				)
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/notice': [
				'# Notice',
				'',
				'## API reference',
				'',
				'### `Notice`',
				'',
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				"| `tone?` | `'neutral' \\| 'info' \\| 'danger'` | `'neutral'` | Visual intent. See [tones](/docs/tones) and `Tone`. |",
				'| `title` | `string` |  | Heading text. |',
				'| `size?` | `number` | `2 (medium)` | Size step. |',
				"| `onclose?` | `(reason: 'button' \\| 'timeout') => void` |  | Called after the notice closes. |",
				'| ~~`legacy?`~~ *(deprecated)* | `string` |  | Deprecated: Use `title`. |',
				'| `children` | `Snippet` |  |  |',
				'',
				'After.'
			].join('\n')
		});
		expect(host.watch).toHaveBeenCalledWith(libFile('notice.svelte'));
		expect(host.warn).not.toHaveBeenCalled();
	});

	it('captions a generic by its type parameters, or by the title, a level below the heading it sits under', async () => {
		const host = literalHost({
			props: {
				[libFile('select.svelte')]: extracted('Select', {
					typeParameters: ['T', 'U'],
					props: [
						prop('options', { type: 'T[]', required: true, description: 'Options to pick from.' }),
						prop('value', { type: 'T', bindable: true, description: 'The picked option.' })
					],
					inherited: [{ kind: 'element', label: 'a' }]
				}),
				[libFile('button.svelte')]: extracted('Button', {
					props: [prop('loading', { type: 'boolean', default: 'false' })],
					inherited: [{ kind: 'type', label: 'ButtonProps' }]
				})
			}
		});
		const pages = [
			page(
				'select',
				'title: Select',
				propsPage(
					{ selectProps: 'select.svelte', buttonProps: 'button.svelte' },
					'<PropsTable of={selectProps} />\n\n## Parts\n\n```md\n# Not a heading\n```\n\n### Button\n\n<PropsTable title="The button" of={buttonProps} />'
				)
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/select': [
				'# Select',
				'',
				'## `Select<T, U>`',
				'',
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				'| `options` | `T[]` |  | Options to pick from. |',
				'| `value?` *(bindable)* | `T` |  | The picked option. |',
				'',
				'Also accepts every `<a>` attribute.',
				'',
				'## Parts',
				'',
				'```md',
				'# Not a heading',
				'```',
				'',
				'### Button',
				'',
				'#### `The button`',
				'',
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				'| `loading?` | `boolean` | `false` |  |',
				'',
				'Also accepts every prop of `ButtonProps`.'
			].join('\n')
		});
	});

	it('says so when a component takes no props', async () => {
		const host = literalHost({ props: { [libFile('static.svelte')]: extracted('Static') } });
		const pages = [
			page(
				'static',
				'title: Static',
				propsPage({ staticProps: 'static.svelte' }, '<PropsTable of={staticProps} />')
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/static': '# Static\n\n## `Static`\n\nNo props.'
		});
	});

	it('escapes pipes and line breaks so each row stays one table row', async () => {
		const host = literalHost({
			props: {
				[libFile('mode.svelte')]: extracted('Mode', {
					props: [
						prop('mode', {
							type: "'a' | 'b'",
							default: "'a'",
							description: 'Pick `a | b`, or neither.\n\nSecond paragraph,\nsoft-wrapped.'
						})
					]
				})
			}
		});
		const pages = [
			page(
				'mode',
				'title: Mode',
				propsPage({ modeProps: 'mode.svelte' }, '<PropsTable of={modeProps} />')
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/mode': [
				'# Mode',
				'',
				'## `Mode`',
				'',
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				"| `mode?` | `'a' \\| 'b'` | `'a'` | Pick `a \\| b`, or neither.<br><br>Second paragraph, soft-wrapped. |"
			].join('\n')
		});
	});

	it('leaves hand-written props tables and props tables in code samples as written', async () => {
		const host = literalHost({ props: { [libFile('button.svelte')]: extracted('Button') } });
		const body =
			'<PropsTable title="Badge">\n\t<Prop name="variant" type="\'a\' | \'b\'">Intent.</Prop>\n</PropsTable>\n\n' +
			'```svelte\n<PropsTable of={buttonProps} />\n```';
		const pages = [
			page('manual', 'title: Manual', propsPage({ buttonProps: 'button.svelte' }, body))
		];

		expect(await agentMarkdown(pages, host)).toEqual({ '/docs/manual': `# Manual\n\n${body}` });
		expect(host.warn).not.toHaveBeenCalled();
	});

	it('writes out a props table inside a LiveExample it keeps', async () => {
		const host = literalHost({ props: { [libFile('button.svelte')]: extracted('Button') } });
		const body = '<LiveExample>\n\t<PropsTable of={buttonProps} />\n</LiveExample>';
		const pages = [
			page('nested', 'title: Nested', propsPage({ buttonProps: 'button.svelte' }, body))
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/nested': '# Nested\n\n<LiveExample>\n\t## `Button`\n\n\tNo props.\n</LiveExample>'
		});
	});

	it('keeps a PropsTable whose props import does not resolve, and warns with the page and specifier', async () => {
		const host = literalHost();
		const pages = [
			page(
				'gone',
				'title: Gone',
				propsPage({ goneProps: 'gone.svelte' }, '<PropsTable of={goneProps} />')
			)
		];

		expect(await agentMarkdown(pages, host)).toEqual({
			'/docs/gone': '# Gone\n\n<PropsTable of={goneProps} />'
		});
		expect(host.props).not.toHaveBeenCalled();
		expect(host.warn).toHaveBeenCalledTimes(1);
		expect(host.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/docs\/gone\/\+page\.md: could not read `\$lib\/gone\.svelte\?props` for <PropsTable of=\{goneProps\}>/
			)
		);
	});

	it('watches a component it asked for props of, so fixing it rebuilds the index', async () => {
		const broken = libFile('broken.svelte');
		const host = literalHost({ unreadable: [broken] });
		const pages = [
			page(
				'broken',
				'title: Broken',
				propsPage({ brokenProps: 'broken.svelte' }, '<PropsTable of={brokenProps} />')
			)
		];

		await llmsIndex(pages, options, host);

		expect(host.watch).toHaveBeenCalledWith(broken);
		expect(host.props).toHaveBeenCalledWith(broken);
	});
});

describe('agent markdown install blocks', () => {
	it('writes an install block out for every package manager', async () => {
		const pages = [page('install', 'title: Install', 'Add it:\n\n```sh pkg\nnpm i -D a\n```')];
		expect(await agentMarkdown(pages, literalHost())).toEqual({
			'/docs/install':
				'# Install\n\nAdd it:\n\n```sh\n# pnpm\npnpm add -D a\n# npm\nnpm i -D a\n# yarn\nyarn add -D a\n# bun\nbun add --dev a\n```'
		});
	});

	it('writes install blocks out on a page with doc imports too', async () => {
		const pages = [
			page(
				'button',
				'title: Button',
				"<script>\n\timport source from './demo.svelte?source';\n</script>\n\n```sh pkg\nnpx sv create\n```\n\n<LiveExample {source} />"
			)
		];
		const host = literalHost({ sources: { [docsFile('button/demo.svelte')]: '<button />' } });
		const markdown = (await agentMarkdown(pages, host))['/docs/button'];
		expect(markdown).toContain('# bun\nbunx sv create');
		expect(markdown).toContain('```svelte\n<button />\n```');
	});
});

describe('agent markdown section cards', () => {
	const section = [
		page('components', 'title: Components\nsection: Components\norder: 0', '<SectionCards />'),
		page('components/card', 'title: Card\nsection: Components\norder: 2\ndescription: A box.'),
		page('components/badge', 'title: Badge\nsection: Components\norder: 1'),
		page('components/forms/input', 'title: Input\nsection: [Components, Forms]\norder: 5'),
		page('guides/start', 'title: Start\nsection: Guides')
	];

	it("writes the page's own section out as links in reading order, without the page", async () => {
		const markdown = await agentMarkdown(section, literalHost());
		expect(markdown['/docs/components']).toBe(
			'# Components\n\n- [Badge](/docs/components/badge)\n- [Card](/docs/components/card): A box.\n- [Forms](/docs/components/forms/input)'
		);
	});

	it('lists the section a `section` attribute names, as a string or an array', async () => {
		const pages = [
			...section,
			page(
				'home',
				'title: Home',
				'<SectionCards section="Guides" />\n\n<SectionCards section={[\'Components\', "Forms"]} />'
			)
		];
		const markdown = await agentMarkdown(pages, literalHost());
		expect(markdown['/docs/home']).toBe(
			'# Home\n\n- [Start](/docs/guides/start)\n\n- [Input](/docs/components/forms/input)'
		);
	});

	it('keeps a tag whose section is an expression, and warns', async () => {
		const pages = [...section, page('home', 'title: Home', '<SectionCards section={which} />')];
		const host = literalHost();
		const markdown = await agentMarkdown(pages, host);
		expect(markdown['/docs/home']).toBe('# Home\n\n<SectionCards section={which} />');
		expect(host.warn).toHaveBeenCalledWith(expect.stringContaining('could not read the `section`'));
	});

	it('leaves SectionCards in code samples as written', async () => {
		const pages = [...section, page('home', 'title: Home', '```svelte\n<SectionCards />\n```')];
		expect((await agentMarkdown(pages, literalHost()))['/docs/home']).toBe(
			'# Home\n\n```svelte\n<SectionCards />\n```'
		);
	});
});
