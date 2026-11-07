/**
 * The props playground's state: everything `<LiveExample controls={…}>` knows
 * apart from how it looks.
 *
 * `LiveExample` creates one per example; `PropsControls` renders its controls
 * and calls back into it. The rules live here: which values the example
 * starts from and resets to, which props can be left unset, how raw control
 * input becomes a value, and the usage line. That keeps them testable without
 * a DOM.
 *
 * @experimental Outside the 1.0 stability promise, like the props import.
 */
import type { ExtractedProp, ExtractedProps, PropValue } from '../../core/extracted-props.js';

/** What the example's `children` snippet receives: prop name to value. */
export type PlaygroundValues = Record<string, unknown>;

/**
 * One control, ready to render: the kind of input, and for a choice of
 * literal values, the choices it offers (`undefined` is "unset").
 */
export type PlaygroundControl = {
	/** The prop the control sets. */
	name: string;
	/** The prop's JSDoc description, as build-time HTML. */
	description?: string;
} & (
	| { kind: 'boolean' }
	| { kind: 'options'; choices: Array<string | number | undefined> }
	| {
			kind: 'text' | 'number';
			/** Whether an empty field leaves the prop unset (shown as an "unset" placeholder). */
			optional: boolean;
	  }
);

export class Playground {
	/** A control for each prop whose type allows one, in declaration order. */
	readonly controls: PlaygroundControl[];

	// The reader's values, with `undefined` for a prop they set back to unset.
	#values = $state<PlaygroundValues>({});

	readonly #props: ExtractedProps;
	readonly #args: () => PlaygroundValues | undefined;

	/**
	 * @param props The component's props import.
	 * @param args The author's starting values, read again on reset. A getter
	 *   so a reset picks up the current `args`.
	 */
	constructor(props: ExtractedProps, args: () => PlaygroundValues | undefined = () => undefined) {
		this.#props = props;
		this.#args = args;
		this.controls = props.props.flatMap((prop) => {
			const control = toControl(prop);
			return control ? [control] : [];
		});
		this.#values = this.#starting();
	}

	/**
	 * The current values, without unset props: what the example receives, so a
	 * spread leaves the unset ones to the component's own defaults.
	 */
	readonly values: Readonly<PlaygroundValues> = $derived.by(() =>
		Object.fromEntries(Object.entries(this.#values).filter(([, value]) => value !== undefined))
	);

	/**
	 * How the component is used with the current values, e.g.
	 * `<Badge variant="success" external>…</Badge>`. Lists the props whose value
	 * is a string, number or boolean and differs from the component's own
	 * default, in declaration order; other values (objects, callbacks) aren't
	 * written out. A component with a `children` prop gets `…` as its content.
	 */
	readonly usage: string = $derived.by(() => usageLine(this.#props, this.#values));

	/** Set a prop to a value, or back to unset with `undefined`. */
	set(name: string, value: unknown): void {
		this.#values[name] = value;
	}

	/** Flip a switch. A boolean that starts unset shows as off, so the first flip turns it on. */
	toggle(name: string): void {
		this.#values[name] = this.#values[name] !== true;
	}

	/**
	 * Set a text or number control from what the reader typed. An empty text
	 * field leaves an optional prop unset and a required one `''`. A number
	 * field that is empty or not a finite number leaves the prop unset, even a
	 * required one: there is no number to hold.
	 */
	enter(name: string, input: string): void {
		const control = this.controls.find((c) => c.name === name);
		if (control?.kind === 'number') {
			const n = input.trim() === '' ? NaN : Number(input);
			this.#values[name] = Number.isFinite(n) ? n : undefined;
		} else if (control?.kind === 'text') {
			this.#values[name] = input === '' && control.optional ? undefined : input;
		}
	}

	/** Put every control back to its starting value. */
	reset(): void {
		this.#values = this.#starting();
	}

	/**
	 * The author's `args`, then each controlled prop's literal default. A prop
	 * with neither is left out, so the component applies its own default.
	 */
	#starting(): PlaygroundValues {
		const values: PlaygroundValues = {};
		for (const prop of this.#props.props) {
			if (prop.control && prop.literalDefault !== undefined)
				values[prop.name] = prop.literalDefault;
		}
		for (const [name, value] of Object.entries(this.#args() ?? {})) {
			if (value !== undefined) values[name] = value;
		}
		return values;
	}
}

function toControl(prop: ExtractedProp): PlaygroundControl | undefined {
	const { name, description, control } = prop;
	switch (control?.kind) {
		case undefined:
			return undefined;
		case 'boolean':
			return { name, description, kind: 'boolean' };
		case 'options':
			// A prop with no literal default can be left unset, so the component
			// applies its own fallback (a computed default, say). A required one
			// that starts unset shows it, rather than a choice it doesn't have.
			return {
				name,
				description,
				kind: 'options',
				choices:
					prop.literalDefault === undefined ? [undefined, ...control.options] : control.options
			};
		case 'text':
		case 'number':
			return { name, description, kind: control.kind, optional: !prop.required };
	}
}

/** Past this length the usage line puts one prop per line. */
const MAX_LINE_LENGTH = 72;

function usageLine(props: ExtractedProps, values: PlaygroundValues): string {
	const defaults = new Map(props.props.map((prop) => [prop.name, prop.literalDefault]));
	// Declared props in declaration order, then any others the author passed.
	const names = [...new Set([...defaults.keys(), ...Object.keys(values)])];
	const markup: string[] = [];
	for (const name of names) {
		const value = values[name];
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
