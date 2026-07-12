<script lang="ts" module>
	export type BadgeVariant =
		| 'default'
		| 'primary'
		| 'secondary'
		| 'success'
		| 'warning'
		| 'danger'
		| 'outline';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		Badge as ShadcnBadge,
		type BadgeVariant as ShadcnVariant
	} from '../shadcn/badge/index.js';

	const {
		variant = 'default',
		href,
		external = false,
		children
	}: {
		/** Visual intent. Default: `default`. */
		variant?: BadgeVariant;
		/** Turns the badge into a link. */
		href?: string;
		/** For a linked badge, open in a new tab with `rel="noopener"`. */
		external?: boolean;
		children: Snippet;
	} = $props();

	// Docs intents map onto the vendored shadcn badge. success/warning aren't
	// shadcn variants, so they render on the `outline` base with token-driven
	// colors layered on top (tailwind-merge lets the extra classes win).
	const base: Record<BadgeVariant, ShadcnVariant> = {
		default: 'secondary',
		primary: 'default',
		secondary: 'secondary',
		success: 'outline',
		warning: 'outline',
		danger: 'destructive',
		outline: 'outline'
	};

	const extra: Partial<Record<BadgeVariant, string>> = {
		success:
			'border-transparent bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
		warning:
			'border-transparent bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
	};
</script>

<ShadcnBadge
	variant={base[variant]}
	{href}
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	class={extra[variant]}
>
	{@render children()}
</ShadcnBadge>
