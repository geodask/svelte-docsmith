<script lang="ts">
	import { docs } from '$content';
	import { DocsShell, type DocsmithConfig } from 'svelte-docsmith';
	import { version } from 'svelte-docsmith/package.json';
	import type { Snippet } from 'svelte';

	const config: DocsmithConfig = {
		title: 'Svelte DocSmith',
		github: 'https://github.com/geodask/svelte-docsmith',
		version
	};

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
