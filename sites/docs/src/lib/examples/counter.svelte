<script lang="ts">
	let count = $state(0);
</script>

<button
	onclick={() => count++}
	class="inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
>
	clicked {count}
	{count === 1 ? 'time' : 'times'}
</button>
