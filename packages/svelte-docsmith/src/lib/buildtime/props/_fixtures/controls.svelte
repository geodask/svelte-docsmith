<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from './types.js';

	let {
		tone = 'info',
		label = `Hello`,
		count = -1,
		step = 2,
		open = $bindable(false),
		id = crypto.randomUUID(),
		size = 'huge' as never,
		mode,
		value,
		data,
		onpick,
		old = false,
		children
	}: {
		tone?: Tone;
		label?: string;
		count?: number;
		step?: 1 | 2 | 3;
		open?: boolean;
		id?: string;
		size?: 'sm' | 'lg';
		mode?: 'a' | 'b' | null;
		value: string | number;
		data?: { a: string };
		onpick?: () => void;
		/** @deprecated */
		old?: boolean;
		children?: Snippet;
	} = $props();
</script>

<p>{tone} {label} {count} {step} {open} {id} {size} {mode} {value} {data} {old}</p>
<button onclick={onpick}>x</button>
{@render children?.()}
