<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';

	const { children }: { children: Snippet } = $props();
</script>

<ModeWatcher />

{@render children()}
