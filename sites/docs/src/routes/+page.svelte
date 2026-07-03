<script lang="ts">
	import EarlyReleaseAlert from '$lib/components/early-release-alert.svelte';
</script>

<div class="max-w-2xl mx-auto mt-16 space-y-6 text-center">
	<h1 class="text-4xl font-bold tracking-tight">Svelte DocSmith</h1>
	<p class="text-lg text-muted-foreground">
		A framework for building beautiful documentation sites with Svelte 5 and SvelteKit.
	</p>
	<div>
		<a
			href="/docs/introduction"
			class="inline-flex h-10 items-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			Get started
		</a>
	</div>
	<EarlyReleaseAlert />
</div>
