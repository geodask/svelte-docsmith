/**
 * The syntax half of props extraction: what can be read from a component's
 * source without TypeScript. That is the `$props()` destructuring (names,
 * default values, `$bindable()`) and the `generics`
 * attribute. Types, optionality and descriptions come from ./typescript.ts.
 */
import { parse } from 'svelte/compiler';
import { splitTopLevel } from '../../utils/type-text.js';

export interface DestructuredProp {
	name: string;
	/** Source text of the default value. */
	default?: string;
	/** The default as a value, when it is a string, number or boolean literal. */
	literal?: string | number | boolean;
	bindable: boolean;
}

export interface ParsedComponent {
	/** Whether the instance script calls `$props()` at all. */
	hasProps: boolean;
	/** Whether the `$props()` declaration carries a type annotation. */
	typed: boolean;
	/** Destructured props, in source order. Empty for `let props = $props()`. */
	destructured: DestructuredProp[];
	/** Type parameter names from `generics="…"`. */
	typeParameters: string[];
}

// The estree nodes we touch, loosely typed: Svelte's parser output includes
// TypeScript annotations that @types/estree doesn't model.
interface Node {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
}

export function parseComponent(code: string, filename: string): ParsedComponent {
	const ast = parse(code, { modern: true, filename });
	const typeParameters = genericsOf(ast.instance?.attributes ?? [], code);
	const empty: ParsedComponent = {
		hasProps: false,
		typed: false,
		destructured: [],
		typeParameters
	};
	if (!ast.instance) return empty;

	const declarator = findPropsDeclarator(ast.instance.content as unknown as Node);
	if (!declarator) return empty;

	const id = declarator.id as Node;
	const typed = Boolean(id.typeAnnotation);
	if (id.type !== 'ObjectPattern') return { ...empty, hasProps: true, typed };

	const destructured: DestructuredProp[] = [];
	for (const property of id.properties as Node[]) {
		// `...rest` is read from the type instead (inherited attributes).
		if (property.type === 'RestElement') continue;
		const name = keyName(property.key as Node);
		if (name === undefined) continue;
		destructured.push({ name, ...defaultOf(property.value as Node, code) });
	}
	return { hasProps: true, typed, destructured, typeParameters };
}

function findPropsDeclarator(node: Node): Node | undefined {
	let found: Node | undefined;
	walk(node, (n) => {
		if (found) return false;
		if (n.type === 'VariableDeclarator' && isCall(n.init as Node | null, '$props')) {
			found = n;
			return false;
		}
		return true;
	});
	return found;
}

function walk(node: Node, visit: (n: Node) => boolean): void {
	if (!visit(node)) return;
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const child of value) if (isNode(child)) walk(child, visit);
		} else if (isNode(value)) {
			walk(value, visit);
		}
	}
}

function isNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function isCall(node: Node | null | undefined, callee: string): boolean {
	if (!node || node.type !== 'CallExpression') return false;
	const fn = node.callee as Node;
	return fn.type === 'Identifier' && fn.name === callee;
}

function keyName(key: Node): string | undefined {
	if (key.type === 'Identifier') return key.name as string;
	if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
	return undefined;
}

function defaultOf(value: Node, code: string): Omit<DestructuredProp, 'name'> {
	if (value.type !== 'AssignmentPattern') return { bindable: false };
	const right = value.right as Node;
	if (isCall(right, '$bindable')) {
		const [fallback] = right.arguments as Node[];
		return fallback
			? { bindable: true, default: source(fallback, code), literal: literalOf(fallback) }
			: { bindable: true };
	}
	return { bindable: false, default: source(right, code), literal: literalOf(right) };
}

/** `'a'`, `3`, `-1`, `true` as values; anything computed is `undefined`. */
function literalOf(node: Node): string | number | boolean | undefined {
	if (node.type === 'Literal') {
		const value = node.value;
		return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
			? value
			: undefined;
	}
	if (node.type === 'TemplateLiteral' && (node.expressions as Node[]).length === 0) {
		const [quasi] = node.quasis as Node[];
		return (quasi.value as { cooked?: string }).cooked;
	}
	if (node.type === 'UnaryExpression' && node.operator === '-') {
		const value = literalOf(node.argument as Node);
		return typeof value === 'number' ? -value : undefined;
	}
	return undefined;
}

function source(node: Node, code: string): string {
	return code.slice(node.start, node.end);
}

/** `generics="T extends string, U = number"` → `['T', 'U']`. */
function genericsOf(attributes: unknown[], code: string): string[] {
	for (const attr of attributes as Node[]) {
		if (attr.type !== 'Attribute' || attr.name !== 'generics') continue;
		const [text] = attr.value as Node[];
		if (!text || text.type !== 'Text') return [];
		return splitTopLevel(String(text.data ?? source(text, code)), ',')
			.map((param) => /^\s*([A-Za-z_$][\w$]*)/.exec(param)?.[1])
			.filter((name): name is string => Boolean(name));
	}
	return [];
}
