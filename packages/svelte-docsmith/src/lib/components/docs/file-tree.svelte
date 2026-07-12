<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<!--
	A static project/directory tree for docs. Compose it from <FileTreeItem>s;
	nesting is just nested items. Works in markdown and plain .svelte alike.
-->
<ul class="filetree not-prose">
	{@render children()}
</ul>

<style>
	.filetree {
		margin: 1.5rem 0;
		padding: 0.75rem 1rem;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85rem;
		line-height: 1.6;
	}
	.filetree :global(ul) {
		list-style: none;
		margin: 0;
		padding-left: 1.05rem;
		border-left: 1px solid var(--border);
		margin-left: 0.5rem;
	}
</style>
