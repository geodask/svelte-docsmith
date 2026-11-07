/**
 * The `?props` doc import. On the page, `Component.svelte?props` loads as the
 * component's extracted props for `<PropsTable of={…}>`, descriptions as HTML.
 * In agent markdown, the tag becomes a heading and a markdown table of the
 * same rows, descriptions as the JSDoc's own markdown. Both read through the
 * one props reader, so the two never extract a component twice.
 */
import {
	propsCaption,
	type ExtractedProp,
	type ExtractedProps
} from '../../../core/extracted-props.js';
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
	return indented(blocks.join('\n\n'), indent);
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
