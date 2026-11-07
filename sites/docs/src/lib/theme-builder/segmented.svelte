<script lang="ts" generics="T extends string">
	// A segmented control: one choice from a few, styled like the docs' tabs
	// (a muted track, the chosen segment raised) so the builder's switches look
	// like the rest of the site. A ToggleGroup underneath, for the semantics
	// and keyboard handling.
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.ts';

	let {
		value,
		options,
		onchange,
		label
	}: {
		value: T;
		options: readonly (readonly [T, string])[];
		onchange: (value: T) => void;
		label: string;
	} = $props();
</script>

<ToggleGroup.Root
	type="single"
	spacing={1}
	{value}
	onValueChange={(v) => v && onchange(v as T)}
	aria-label={label}
	class="bg-muted h-9 w-full rounded-lg p-[3px]"
>
	{#each options as [option, name] (option)}
		<ToggleGroup.Item
			value={option}
			class="text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground h-full flex-1 rounded-md border border-transparent hover:bg-transparent data-[state=on]:shadow-sm"
			>{name}</ToggleGroup.Item
		>
	{/each}
</ToggleGroup.Root>
