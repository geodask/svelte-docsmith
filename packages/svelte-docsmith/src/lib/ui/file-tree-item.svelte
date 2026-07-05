<script lang="ts">
	import Folder from '@lucide/svelte/icons/folder';
	import FileIcon from '@lucide/svelte/icons/file';
	import type { Snippet } from 'svelte';

	const {
		name,
		folder = false,
		highlight = false,
		children
	}: {
		/** File or directory name. */
		name: string;
		/** Force folder styling for an empty directory (folders with children are detected automatically). */
		folder?: boolean;
		/** Emphasize this entry — e.g. the file a guide is about to create. */
		highlight?: boolean;
		/** Nested entries. Their presence marks this item as a folder. */
		children?: Snippet;
	} = $props();

	const isFolder = $derived(folder || !!children);
</script>

<li class="ft-item">
	<span class="ft-label" class:ft-highlight={highlight}>
		{#if isFolder}
			<Folder class="ft-icon ft-icon-folder" size={15} aria-hidden="true" />
		{:else}
			<FileIcon class="ft-icon ft-icon-file" size={15} aria-hidden="true" />
		{/if}
		<span class="ft-name">{name}</span>
	</span>
	{#if children}
		<ul>
			{@render children()}
		</ul>
	{/if}
</li>

<style>
	.ft-item {
		margin: 0;
		padding: 0;
	}
	.ft-label {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.1rem 0.35rem;
		border-radius: calc(var(--radius) - 2px);
	}
	.ft-highlight {
		background: color-mix(in oklch, var(--primary) 12%, transparent);
		color: var(--primary);
		font-weight: 600;
	}
	:global(.filetree .ft-icon) {
		flex-shrink: 0;
	}
	:global(.filetree .ft-icon-folder) {
		color: var(--primary);
	}
	:global(.filetree .ft-icon-file) {
		color: var(--muted-foreground);
	}
	.ft-name {
		color: var(--foreground);
	}
</style>
