<script lang="ts">
	import Link from '@lucide/svelte/icons/link';
	import type { HeadingProps } from './types.js';

	const { children, ...attrs }: HeadingProps = $props();
</script>

<h3 {...attrs} class="group flex items-center gap-2">
	{@render children()}
	<a
		href="#{attrs.id}"
		aria-label="Link to this section"
		class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
	>
		<Link class="text-primary size-5" />
	</a>
</h3>
