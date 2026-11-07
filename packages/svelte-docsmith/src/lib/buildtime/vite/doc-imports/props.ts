/**
 * The `?props` doc import. On the page, `Component.svelte?props` loads as the
 * component's extracted props for `<PropsTable of={…}>`, descriptions as HTML.
 * In agent markdown, the tag becomes a heading and a markdown table of the
 * same rows, descriptions as the JSDoc's own markdown. Both read through the
 * one props reader, so the two never extract a component twice.
 */
import type { ExtractedProps } from '../../../core/extracted-props.js';
import { propsReference, type PropRow } from '../../../core/props-reference.js';
import type { DocImportKind } from './index.js';
import { fenceFor, indented } from './markdown.js';

export const propsImport: DocImportKind<'props'> = {
	query: 'props',

	async module(file, hook, { props }) {
		const result = await props.read(file, hook);
		return `export default ${JSON.stringify(result.props)};`;
	},

	async read(file, hook, { props }) {
		return (await props.read(file, hook)).markdown;
	},

	tag: 'PropsTable',
	attribute: 'of',

	write(props, { attributes, indent, level }) {
		const title = TITLE_ATTRIBUTE.exec(attributes);
		const caption = title ? title.slice(1).find((value) => value !== undefined) : undefined;
		return propsTable(props, caption, Math.min(6, level + 1), indent);
	}
};

/** A `title` given as a string literal, quoted or in braces. */
const TITLE_ATTRIBUTE =
	/(?:^|\s)title\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/;

/**
 * A generated props table as agent markdown: the caption as a heading, then a
 * `Prop | Type | Default | Description` table of the page's rows, then the
 * page's notes.
 */
function propsTable(
	props: ExtractedProps,
	title: string | undefined,
	level: number,
	indent: string
): string {
	const { caption, rows, notes } = propsReference(props, title);
	const blocks = [`${'#'.repeat(level)} ${code(caption)}`];
	if (rows.length) {
		blocks.push(
			[
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				...rows.map((row) => `| ${rowCells(row).join(' | ')} |`)
			].join('\n')
		);
	}
	for (const note of notes) {
		blocks.push(note.map((part) => (typeof part === 'string' ? part : code(part.code))).join(''));
	}
	return indented(blocks.join('\n\n'), indent);
}

/** One row's cells, marked as the rendered row is and escaped for a table. */
function rowCells(row: PropRow): string[] {
	let name = code(row.required ? row.name : `${row.name}?`);
	if (row.deprecated) name = `~~${name}~~`;
	const marks = [row.bindable && '*(bindable)*', row.deprecated && '*(deprecated)*'];
	return [
		[name, ...marks.filter(Boolean)].join(' '),
		row.type === undefined ? '' : code(row.type),
		row.default === undefined ? '' : code(row.default),
		row.description.map(inline).join('<br>')
	].map((cell) => cell.replaceAll('|', '\\|'));
}

/** `text` as a code span on one line, fenced longer than any backtick run in it. */
function code(text: string): string {
	const flat = text.replace(/\s*\n\s*/g, ' ');
	const fence = fenceFor(flat, 1);
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
