<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Tone } from '#lib/buildtime/props/_fixtures/types.js';
	import Button from '#lib/buildtime/props/_fixtures/button.svelte';

	let { tone, loading }: { tone: Tone; loading?: ComponentProps<typeof Button>['loading'] } =
		$props();
</script>

<p>{tone} {loading}</p>
