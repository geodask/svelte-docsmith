<script lang="ts">
	import Construction from '@lucide/svelte/icons/construction';
</script>

<div
	role="alert"
	class="flex gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-start text-yellow-600 dark:text-yellow-400"
>
	<Construction class="mt-0.5 shrink-0" size={18} />
	<div>
		<p class="font-medium">Development in Progress</p>
		<p class="text-sm">
			The library is currently in active development. Each minor release may contain breaking
			changes until it reaches a stable v1.0 release.
		</p>
	</div>
</div>
