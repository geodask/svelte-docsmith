/**
 * What a generated props table says, decided once for every surface that
 * shows one: the caption, a prop row per prop with its description paragraphs,
 * and the notes under the rows (inherited attributes, or that there are no
 * props). The page's `<PropsTable of={…}>` and agent markdown only render it.
 *
 * Text comes through in the props import's own format: inline HTML on the
 * page, the JSDoc's markdown in agent markdown. The wording added here has no
 * characters either format treats specially, so it reads the same in both.
 *
 * @experimental Outside the 1.0 stability promise, like the props import.
 */
import type { ExtractedProps } from './extracted-props.js';

export interface PropsReference {
	/** The author's `title`, else the component's name with its type parameters (`Select<T>`). */
	caption: string;
	/** One per declared prop, in declaration order. */
	rows: PropRow[];
	/** What follows the rows: one per inherited attributes group, or the empty case. */
	notes: PropsNote[];
}

export interface PropRow {
	name: string;
	type?: string;
	default?: string;
	required: boolean;
	bindable: boolean;
	deprecated: boolean;
	/**
	 * What the row says under its name, one paragraph each: the deprecation
	 * note when the tag has text, then the description. Empty when neither.
	 */
	description: string[];
}

/**
 * A sentence under the rows, as plain text and code spans, e.g.
 * `['Also accepts every ', { code: '<a>' }, ' attribute.']`.
 */
export type PropsNote = (string | { code: string })[];

/** A props import as a props table's caption, rows and notes. */
export function propsReference(props: ExtractedProps, title?: string): PropsReference {
	const params = props.typeParameters;
	const notes: PropsNote[] = props.inherited.map((group) =>
		group.kind === 'element'
			? ['Also accepts every ', { code: `<${group.label}>` }, ' attribute.']
			: ['Also accepts every prop of ', { code: group.label }, '.']
	);
	if (props.props.length === 0 && notes.length === 0) notes.push(['No props.']);
	return {
		caption: title ?? props.name + (params.length ? `<${params.join(', ')}>` : ''),
		rows: props.props.map((prop) => ({
			name: prop.name,
			type: prop.type,
			default: prop.default,
			required: prop.required,
			bindable: prop.bindable,
			deprecated: prop.deprecated !== undefined,
			description: [prop.deprecated && deprecationNote(prop.deprecated), prop.description].filter(
				(text): text is string => !!text
			)
		})),
		notes
	};
}

/**
 * What a deprecated prop says about it: `Deprecated: Use value.` When the
 * text is paragraphs of HTML, the prefix opens the first one, so the note
 * reads as one sentence on the page as it does in agent markdown.
 */
export function deprecationNote(text: string): string {
	return text.replace(/^(<p>)?/, '$1Deprecated: ');
}

/** Tags whose end breaks the line in plain text. */
const LINE_BREAK = /<br\s*\/?>|<\/(?:p|li|h[1-6]|blockquote|pre|div|tr|dt|dd)>/gi;

/** The named references markdown escapes to, and ones raw HTML in a JSDoc commonly writes. */
const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: '\u00a0',
	ndash: '\u2013',
	mdash: '\u2014',
	hellip: '\u2026',
	lsquo: '\u2018',
	rsquo: '\u2019',
	ldquo: '\u201c',
	rdquo: '\u201d',
	laquo: '\u00ab',
	raquo: '\u00bb',
	middot: '\u00b7',
	bull: '\u2022',
	times: '\u00d7',
	larr: '\u2190',
	rarr: '\u2192',
	copy: '\u00a9',
	reg: '\u00ae',
	trade: '\u2122'
};

/** A numeric (`&#8212;`, `&#x2014;`) or named (`&mdash;`) character reference. */
const ENTITY = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+\d*));/gi;

/**
 * A description from the page's props import (inline HTML rendered at build
 * time) as plain text, for places that take no markup, like a tooltip. Line
 * breaks and block ends become new lines, soft breaks become spaces, and
 * character references are decoded (named ones it doesn't know stay as written).
 */
export function plainDescription(html: string | undefined): string | undefined {
	return html
		?.replace(/\s+/g, ' ')
		.replace(LINE_BREAK, (tag) => `${tag}\n`)
		.replace(/<[^>]+>/g, '')
		.replace(ENTITY, (entity, decimal?: string, hex?: string, name?: string) => {
			if (name) return NAMED_ENTITIES[name] ?? entity;
			const code = decimal ? Number(decimal) : parseInt(hex!, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
		})
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join('\n');
}
