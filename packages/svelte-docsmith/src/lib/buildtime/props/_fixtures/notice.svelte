<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Item, Tone } from './types.js';

	const {
		tone = 'neutral',
		title,
		items = [],
		dismissible = false,
		size = 2,
		secret,
		onclose,
		legacy,
		children
	}: {
		/** Visual intent. See [tones](/docs/tones) and `Tone`. */
		tone?: Tone;
		/** Heading text. */
		title: string;
		/** Things to list. */
		items?: Item[];
		/** Show a close button. */
		dismissible?: boolean;
		/**
		 * Size step.
		 * @default 2 (medium)
		 */
		size?: number;
		/** @internal */
		secret?: string;
		/** Called after the notice closes. */
		onclose?: (reason: 'button' | 'timeout') => void;
		/** @deprecated Use `title`. */
		legacy?: string;
		children: Snippet;
	} = $props();
</script>

<p>{tone} {title} {items.length} {dismissible} {size} {secret} {legacy}</p>
<button onclick={() => onclose?.('button')}>x</button>
{@render children()}
