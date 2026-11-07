<script lang="ts">
	// One line of text to copy, such as a command or a link: shown in a field
	// that cuts off rather than wraps, with a copy button that says it worked.
	import { Button } from '#lib/components/ui/button/index.ts';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let { value, label, prefix = '' }: { value: string; label: string; prefix?: string } = $props();
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<div
	class="border-input dark:bg-input/30 flex h-9 min-w-0 items-center gap-2 rounded-md border bg-transparent pr-1 pl-3 shadow-xs"
>
	<code class="min-w-0 flex-1 truncate font-mono text-xs" title={value}
		>{#if prefix}<span class="text-muted-foreground select-none">{prefix}</span>{/if}{value}</code
	>
	<Button
		variant="ghost"
		size="icon-sm"
		class="text-muted-foreground hover:text-foreground size-7 shrink-0"
		aria-label={copied ? 'Copied' : `Copy ${label}`}
		onclick={copy}
	>
		{#if copied}<Check class="size-3.5" />{:else}<Copy class="size-3.5" />{/if}
	</Button>
</div>
