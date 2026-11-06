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
	/** Attributes or props the component also accepts by spreading the rest. */
	inherited: InheritedProps[];
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
}

export interface InheritedProps {
	/**
	 * `element`: native attributes of an HTML element (`label` is the tag name).
	 * `type`: every prop of some other type (`label` is that type, as written).
	 */
	kind: 'element' | 'type';
	label: string;
}
