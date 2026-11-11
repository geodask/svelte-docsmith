export interface Placement {
	side: 'top' | 'bottom';
	/**
	 * Gap from the trigger, in pixels.
	 * @default 4
	 */
	offset?: number;
}

export interface Options {
	/**
	 * Delay before opening, in **ms**.
	 * @since 0.3
	 */
	delay?: number;
	/** Where it sits. */
	placement: Placement;
	/** @internal */
	secret?: string;
	/** @deprecated Use `delay`. */
	wait?: number;
}

export interface TreeNode {
	label: string;
	children?: TreeNode[];
}

export interface Column {
	key: string;
	/** Header text. */
	header?: string;
}

export type Choice = { kind: 'text'; placeholder?: string } | { kind: 'number'; min?: number };

/** An alias that contains itself, as `ClassValue` does. */
export type Nested = string | Nested[] | { [key: string]: Nested };
