/**
 * What a props import (`Component.svelte?props`) yields: one component's props,
 * extracted at build time from its own source, for `<PropsTable of={…}>`.
 *
 * @experimental Outside the 1.0 stability promise. The shape is internal to
 * `PropsTable` and may change in a minor.
 */
export interface ExtractedProps {
	/** Component name derived from the file name, e.g. `FileTree`. */
	name: string;
	/** Type parameter names of a generic component, e.g. `['T']`. */
	typeParameters: string[];
	/** Declared props, in declaration order. */
	props: ExtractedProp[];
	/** What the component also accepts by spreading its remaining props. */
	inherited: InheritedAttributes[];
}

export interface ExtractedProp {
	name: string;
	/** Resolved type, e.g. `'a' | 'b'`. Absent when the props are untyped. */
	type?: string;
	/** Source text of the default value, e.g. `'default'`. */
	default?: string;
	required: boolean;
	/** Declared with `$bindable()`. */
	bindable: boolean;
	/** Present when tagged `@deprecated`: the tag's text as inline HTML, or `''`. */
	deprecated?: string;
	/** JSDoc description rendered to inline HTML. */
	description?: string;
	/**
	 * How a props playground edits this prop, from its type. Absent when the
	 * type has no control (snippets, callbacks, objects, generics) or the prop
	 * is deprecated.
	 */
	control?: PropControl;
	/** The default as a value, when its source text is a literal (`'a'`, `false`, `-1`). */
	initial?: PropValue;
}

/** A value a props playground control can hold. */
export type PropValue = string | number | boolean;

/**
 * The control a props playground shows for a prop: a switch for `boolean`,
 * inputs for `string` and `number`, a choice for a union of literals.
 */
export type PropControl =
	| { kind: 'boolean' }
	| { kind: 'text' }
	| { kind: 'number' }
	| { kind: 'options'; options: (string | number)[] };

export interface InheritedAttributes {
	/**
	 * `element`: native attributes of an HTML element (`label` is the tag name).
	 * `type`: every prop of some other type (`label` is that type, as written).
	 */
	kind: 'element' | 'type';
	label: string;
}

/**
 * A generated props table's caption when the author gives no `title`: the
 * component's name, with its type parameters for a generic (`Select<T, U>`).
 */
export function propsCaption(props: ExtractedProps): string {
	const params = props.typeParameters;
	return props.name + (params.length ? `<${params.join(', ')}>` : '');
}
