<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
</script>

<ErrorPage
	{content}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	home="/docs/introduction"
	homeLabel="Back to the docs"
/>
