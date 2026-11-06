/**
 * Agent markdown: a page's markdown as an agent reads it (llms-full.txt, the
 * `.md` twins, the MCP server). The page as written keeps `<LiveExample
 * source={…}>` and `<PropsTable of={…}>` as bare tags and their imports are
 * stripped with the `<script>` block, so an agent would never see the example
 * code or the component's props. Here each `LiveExample` whose source is a
 * `?source` import becomes a fenced `svelte` block of the example file's raw
 * source, and each `PropsTable` whose `of` is a props import becomes a heading
 * and a markdown table of the same rows the page renders.
 *
 * Unlike `./collect.js` this reads the filesystem and resolves imports, so it
 * runs in the plugin, which hands it Vite's resolver and the props extractor.
 */
import fs from 'node:fs';
import {
	propsCaption,
	type ExtractedProp,
	type ExtractedProps
} from '../../core/extracted-props.js';
import { outsideCodeFenceRuns, scriptBlocks } from '../markdown-source.js';
import { relativeToCwd } from '../paths.js';
import type { SourcePage } from './pages.js';

/** Which build-time transform a page import goes through. */
export type DocImportKind = 'source' | 'props';

/** One `*.svelte?source` or `*.svelte?props` import in a page's `<script>`. */
export type DocImport = {
	kind: DocImportKind;
	/** The specifier as written, query included, for messages. */
	specifier: string;
	/** The component file it resolves to, or `undefined` when it did not resolve. */
	file: string | undefined;
};

/**
 * Resolve a specifier (query stripped) from a page, the way Vite resolves the
 * page's own imports: the app's aliases (`$lib`, `#lib`) included. Returns the
 * resolved file, or `undefined` when nothing resolves it.
 */
export type ResolveImport = (specifier: string, importer: string) => Promise<string | undefined>;

/** What building agent markdown needs from the plugin. */
export type AgentMarkdownHost = {
	resolve: ResolveImport;
	/** Record a file the agent markdown was read from, so editing it rebuilds the index. */
	watch(file: string): void;
	warn(message: string): void;
	/**
	 * A component's props as the `?props` transform extracts them, with
	 * descriptions as markdown. The host watches the files they were read from
	 * and passes on extraction warnings.
	 */
	props(file: string): Promise<ExtractedProps>;
};

/** A default import of a `.svelte` file through `?source` or `?props`. */
const DOC_IMPORT =
	/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"\n]+?\.svelte)\?(source|props)\2/g;

/**
 * A page's `?source` and `?props` imports, keyed by the local name each binds,
 * with every specifier resolved from the page. Imports inside fenced code
 * samples are not the page's, and are skipped.
 */
export async function docImports(
	page: Pick<SourcePage, 'file' | 'source'>,
	resolve: ResolveImport
): Promise<Map<string, DocImport>> {
	const imports = new Map<string, DocImport>();
	for (const block of scriptBlocks(page.source)) {
		for (const [, local, , base, kind] of block.matchAll(DOC_IMPORT)) {
			const file = await resolve(base, page.file);
			imports.set(local, { kind: kind as DocImportKind, specifier: `${base}?${kind}`, file });
		}
	}
	return imports;
}

/**
 * A `<LiveExample …>…</LiveExample>` (or self-closing) tag starting a line.
 * Group 1 is its indentation, group 2 its attributes; an attribute value in
 * braces may contain `>`.
 */
const LIVE_EXAMPLE =
	/^([ \t]*)<LiveExample\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>[\s\S]*?<\/LiveExample\s*>)/gm;

/** `source={name}`, or the `{source}` shorthand. */
const SOURCE_ATTRIBUTE = /(?:\bsource\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|\{\s*(source)\s*\})/;

/** A fenced block of `code`, fenced longer than any backtick run inside it. */
function fenced(code: string, lang: string, indent: string): string {
	const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map(([run]) => run.length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return [fence + lang, ...code.split('\n'), fence]
		.map((line) => (line ? indent + line : line))
		.join('\n');
}

/**
 * Build the agent markdown rewrite for one page: a function from the page's
 * llms content to its agent markdown. `undefined` when the page imports nothing
 * agent markdown expands, so most pages cost one scan of their script.
 */
export async function agentMarkdownFor(
	page: SourcePage,
	host: AgentMarkdownHost
): Promise<((content: string) => string) | undefined> {
	const imports = await docImports(page, host.resolve);
	if (imports.size === 0) return undefined;

	// Read up front, so the rewrite itself is synchronous.
	const sources = new Map<string, string | undefined>();
	const tables = new Map<string, ExtractedProps | undefined>();
	for (const [local, entry] of imports) {
		// Watched even when it can't be read, so creating or fixing it rebuilds.
		if (entry.file !== undefined) host.watch(entry.file);
		if (entry.kind === 'source') {
			sources.set(local, entry.file === undefined ? undefined : readExample(entry.file));
		} else {
			tables.set(local, entry.file === undefined ? undefined : await host.props(entry.file));
		}
	}

	const keepTag = (tag: string, local: string, attribute: string) => {
		host.warn(
			`${relativeToCwd(page.file)}: could not read \`${imports.get(local)?.specifier}\` ` +
				`for <${tag} ${attribute}={${local}}>, so agent markdown keeps the tag.`
		);
	};

	return (content) => {
		// The level of the heading a table sits under, carried across code fences.
		let level = 1;
		return outsideCodeFenceRuns(content, (prose) => {
			const levelAt = (offset: number) => lastHeadingLevel(prose.slice(0, offset)) ?? level;
			const withTables = prose.replace(
				PROPS_TABLE,
				(tag, indent: string, attributes: string, offset: number) => {
					const match = OF_ATTRIBUTE.exec(attributes);
					const local = match?.[1] ?? match?.[2];
					if (local === undefined || !tables.has(local)) return tag;
					const props = tables.get(local);
					if (props === undefined) {
						keepTag('PropsTable', local, 'of');
						return tag;
					}
					const title = TITLE_ATTRIBUTE.exec(attributes);
					const caption = title ? title.slice(1).find((value) => value !== undefined) : undefined;
					return propsTable(props, caption, Math.min(6, levelAt(offset) + 1), indent);
				}
			);
			level = levelAt(prose.length);
			return withTables.replace(LIVE_EXAMPLE, (tag, indent: string, attributes: string) => {
				const match = SOURCE_ATTRIBUTE.exec(attributes);
				const local = match?.[1] ?? match?.[2];
				if (local === undefined || !sources.has(local)) return tag;
				const code = sources.get(local);
				if (code === undefined) {
					keepTag('LiveExample', local, 'source');
					return tag;
				}
				return fenced(code, 'svelte', indent);
			});
		});
	};
}

/**
 * A `<PropsTable …/>` or `<PropsTable …>…</PropsTable>` tag starting a line,
 * grouped like {@link LIVE_EXAMPLE}.
 */
const PROPS_TABLE =
	/^([ \t]*)<PropsTable\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>[\s\S]*?<\/PropsTable\s*>)/gm;

/** `of={name}`, or the `{of}` shorthand. */
const OF_ATTRIBUTE = /(?:(?:^|\s)of\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|\{\s*(of)\s*\})/;

/** A `title` given as a string literal, quoted or in braces. */
const TITLE_ATTRIBUTE =
	/(?:^|\s)title\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/;

/** An ATX heading's marker. */
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]|$)/gm;

/** The level of the last heading in `prose`, if it has one. */
function lastHeadingLevel(prose: string): number | undefined {
	return [...prose.matchAll(HEADING)].at(-1)?.[1].length;
}

/**
 * A generated props table as agent markdown: the caption as a heading, then a
 * `Prop | Type | Default | Description` table with the rows the page renders,
 * then the inherited attributes summary.
 */
function propsTable(
	props: ExtractedProps,
	title: string | undefined,
	level: number,
	indent: string
): string {
	const blocks = [`${'#'.repeat(level)} ${code(title ?? propsCaption(props))}`];
	if (props.props.length) {
		blocks.push(
			[
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				...props.props.map((prop) => `| ${propCells(prop).join(' | ')} |`)
			].join('\n')
		);
	}
	for (const group of props.inherited) {
		blocks.push(
			group.kind === 'element'
				? `Also accepts every ${code(`<${group.label}>`)} attribute.`
				: `Also accepts every prop of ${code(group.label)}.`
		);
	}
	if (props.props.length === 0 && props.inherited.length === 0) blocks.push('No props.');
	return blocks
		.join('\n\n')
		.split('\n')
		.map((line) => (line ? indent + line : line))
		.join('\n');
}

/** One row's cells, marked as the rendered row is and escaped for a table. */
function propCells(prop: ExtractedProp): string[] {
	let name = code(prop.required ? prop.name : `${prop.name}?`);
	if (prop.deprecated !== undefined) name = `~~${name}~~`;
	const marks = [
		prop.bindable && '*(bindable)*',
		prop.deprecated !== undefined && '*(deprecated)*'
	];
	const description = [prop.deprecated && `Deprecated: ${prop.deprecated}`, prop.description]
		.filter(Boolean)
		.map((text) => inline(text as string))
		.join('<br>');
	return [
		[name, ...marks.filter(Boolean)].join(' '),
		prop.type === undefined ? '' : code(prop.type),
		prop.default === undefined ? '' : code(prop.default),
		description
	].map((cell) => cell.replaceAll('|', '\\|'));
}

/** `text` as a code span on one line, fenced longer than any backtick run in it. */
function code(text: string): string {
	const flat = text.replace(/\s*\n\s*/g, ' ');
	const longest = Math.max(0, ...[...flat.matchAll(/`+/g)].map(([run]) => run.length));
	const fence = '`'.repeat(longest + 1);
	const pad = flat.startsWith('`') || flat.endsWith('`') ? ' ' : '';
	return fence + pad + flat + pad + fence;
}

/** Markdown on one line: paragraphs joined with `<br><br>`, soft breaks as spaces. */
function inline(markdown: string): string {
	return markdown
		.trim()
		.split(/\n[ \t]*\n\s*/)
		.map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' '))
		.join('<br><br>');
}

/** An example file's raw source, as the `?source` transform reads it. */
function readExample(file: string): string | undefined {
	try {
		return fs.readFileSync(file, 'utf-8').trimEnd();
	} catch {
		return undefined;
	}
}
