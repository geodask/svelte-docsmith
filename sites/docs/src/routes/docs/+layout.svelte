<script lang="ts">
	import { docs } from '$content';
	import { DocsShell, type DocsmithConfig } from 'svelte-docsmith';
	import { version } from 'svelte-docsmith/package.json';
	import SiteFooter from '$lib/components/site-footer.svelte';
	import type { Snippet } from 'svelte';

	const config: DocsmithConfig = {
		title: 'Svelte DocSmith',
		github: 'https://github.com/geodask/svelte-docsmith',
		version
	};

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell {config} content={docs} pattern>
	{@render children()}

	{#snippet footer()}
		<SiteFooter />
	{/snippet}
</DocsShell>
