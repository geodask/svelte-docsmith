/**
 * What an `Anatomy` shares with its `Part`s: each Part registers its name, in
 * the order the author wrote them, and takes its number from that order. The
 * Part the reader points at is shared back, so its labels light up.
 */
import { getContext, setContext } from 'svelte';

const KEY = Symbol('docsmith-anatomy');

export type AnatomyContext = {
	/** Register a part by name. Returns a function that unregisters it. */
	register(name: string): () => void;
	/** The number the labels show for a part, by its place among the parts. */
	numberOf(name: string): number | undefined;
	/** The part the reader is pointing at or focused on, if any. */
	active: string | undefined;
};

export function setAnatomy(context: AnatomyContext): void {
	setContext(KEY, context);
}

export function findAnatomy(): AnatomyContext | undefined {
	return getContext<AnatomyContext | undefined>(KEY);
}
