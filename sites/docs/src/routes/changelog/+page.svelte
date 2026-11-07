<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { releases } from 'svelte-docsmith/changelog';
	import { DocsShell, Changelog } from 'svelte-docsmith';
</script>

<DocsShell
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	{content}
	layout="page"
	pattern
	seo={{ title: 'Changelog', description: 'What shipped in each release of Svelte DocSmith.' }}
>
	<Changelog {releases} description="What shipped in each release." />
</DocsShell>
