<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		href,
		variant = 'primary',
		external = false,
		arrow = variant === 'primary',
		children
	}: {
		href: string;
		/** `primary` is the filled button, `secondary` the outlined one beside it. */
		variant?: 'primary' | 'secondary';
		external?: boolean;
		/** Trailing arrow that nudges on hover. Defaults on for `primary`. */
		arrow?: boolean;
		children: Snippet;
	} = $props();

	const rel = $derived(external ? 'noopener noreferrer' : undefined);
	const target = $derived(external ? '_blank' : undefined);
</script>

<!-- A call-to-action link for <Hero> and <CTA>. Deliberately small: anything more
     elaborate is better written as a plain anchor in your own page. -->
<a
	{href}
	{rel}
	{target}
	class="group inline-flex h-11 items-center gap-2 rounded-lg px-6 font-medium transition-all {variant ===
	'primary'
		? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
		: 'border-border bg-background hover:bg-accent border'}"
>
	{@render children()}
	{#if arrow}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4 transition-transform group-hover:translate-x-0.5"
			aria-hidden="true"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	{/if}
</a>
