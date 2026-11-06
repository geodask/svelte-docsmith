/**
 * The logic behind a props playground (`<LiveExample controls={…}>`): which
 * values the example starts from, and the usage line that shows what the
 * reader changed. Kept out of the component so it can be tested without a DOM.
 *
 * @experimental Outside the 1.0 stability promise, like the props import.
 */
import type { ExtractedProp, ExtractedProps, PropValue } from './extracted-props.js';

/** What the example's `children` snippet receives: prop name to value. */
export type PlaygroundValues = Record<string, unknown>;

/** The props a playground shows a control for, in declaration order. */
export function controlledProps(props: ExtractedProps): ExtractedProp[] {
	return props.props.filter((prop) => prop.control !== undefined);
}

/**
 * The values an example starts from, and returns to on reset: the author's
 * `args`, then each controlled prop's literal default. A prop with neither is
 * left out, so the component applies its own default.
 */
export function startingValues(
	props: ExtractedProps,
	args: PlaygroundValues = {}
): PlaygroundValues {
	const values: PlaygroundValues = {};
	for (const prop of controlledProps(props)) {
		if (prop.literalDefault !== undefined) values[prop.name] = prop.literalDefault;
	}
	for (const [name, value] of Object.entries(args)) {
		if (value !== undefined) values[name] = value;
	}
	return values;
}

/** `values` without the props set to `undefined`, so a spread leaves them to the component. */
export function definedValues(values: PlaygroundValues): PlaygroundValues {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

/** Past this length the usage line puts one prop per line. */
const MAX_LINE_LENGTH = 72;

/**
 * How the component is used with the current values, e.g.
 * `<Badge variant="success" external>…</Badge>`. Lists the props whose value
 * is a string, number or boolean and differs from the component's own
 * default; other values (objects, callbacks) aren't written out. A component
 * with a `children` prop gets `…` as its content.
 */
export function usageLine(props: ExtractedProps, values: PlaygroundValues): string {
	const defaults = new Map(props.props.map((prop) => [prop.name, prop.literalDefault]));
	const markup: string[] = [];
	for (const [name, value] of Object.entries(values)) {
		if (!isPropValue(value) || defaults.get(name) === value) continue;
		markup.push(propMarkup(name, value));
	}
	const hasChildren = props.props.some((prop) => prop.name === 'children');
	const close = hasChildren ? `>…</${props.name}>` : ' />';
	const inline = `<${props.name}${markup.map((m) => ' ' + m).join('')}${close}`;
	if (inline.length <= MAX_LINE_LENGTH || markup.length < 2) return inline;
	const end = hasChildren ? `\n>\n\t…\n</${props.name}>` : '\n/>';
	return `<${props.name}\n${markup.map((m) => '\t' + m).join('\n')}${end}`;
}

function isPropValue(value: unknown): value is PropValue {
	return (
		typeof value === 'string' ||
		(typeof value === 'number' && Number.isFinite(value)) ||
		typeof value === 'boolean'
	);
}

/** One prop as Svelte markup: `a="x"`, `a`, `a={false}`, `a={3}`. */
function propMarkup(name: string, value: PropValue): string {
	if (value === true) return name;
	if (typeof value === 'string') {
		return /["{}]/.test(value) ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
	}
	return `${name}={${value}}`;
}
