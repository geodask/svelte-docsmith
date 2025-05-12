<script lang="ts">
	import { Link } from '@lucide/svelte';
	import type { HeadingProps } from './types';

	const { children, ...attrs }: HeadingProps = $props();
</script>

<h3 {...attrs} class="flex gap-2 items-center group">
	{@render children()}
	<a href="#{attrs.id}" class="opacity-0 group-hover:opacity-100 transition-opacity">
		<Link class="size-5 text-primary" />
	</a>
</h3>
