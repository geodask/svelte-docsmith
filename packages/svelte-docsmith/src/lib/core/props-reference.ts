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

/** What a deprecated prop says about it: `Deprecated: Use value.` */
export function deprecationNote(text: string): string {
	return `Deprecated: ${text}`;
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'"
};

/**
 * A description from the page's props import (inline HTML rendered at build
 * time) as plain text, for places that take no markup, like a tooltip.
 */
export function plainDescription(html: string | undefined): string | undefined {
	return html
		?.replace(/<[^>]+>/g, '')
		.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
}
