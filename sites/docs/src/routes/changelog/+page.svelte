<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { releases } from 'svelte-docsmith/changelog';
	import { DocsShell, Changelog } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<DocsShell
	config={siteConfig}
	content={docs}
	layout="page"
	pattern
	seo={{ title: 'Changelog', description: 'What shipped in each release of Svelte DocSmith.' }}
>
	<Changelog {releases} description="What shipped in each release." />
</DocsShell>
