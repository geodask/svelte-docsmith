<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
	import { page } from '$app/state';
	import { trackNotFound } from '#lib/analytics.ts';

	// Once per missing path, including client-side navigations between them.
	$effect(() => {
		if (page.status === 404) trackNotFound(page.url.pathname);
	});
</script>

<ErrorPage
	{content}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	home="/docs/introduction"
	homeLabel="Back to the docs"
/>
