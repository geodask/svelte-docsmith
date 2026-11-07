<script lang="ts">
	// Every token, editable, for one colour mode at a time. A hand edit sticks
	// until a guided control changes that token; text under WCAG AA is flagged.
	import { modeTokens, parseColour, type Mode } from './core.ts';
	import type { Builder } from './builder.svelte.ts';

	let { builder }: { builder: Builder } = $props();
	let mode = $state<Mode>('light');

	const shown = $derived(modeTokens(builder.tokens, mode));
	const edited = $derived(builder.state.overrides[mode]);
	const issues = $derived(builder.issues.filter((issue) => issue.mode === mode));
	const flagged = $derived(new Set(issues.map((issue) => issue.text)));

	const groups: [string, (key: string) => boolean][] = [
		[
			'Surfaces and text',
			(k) => !/^(chart|sidebar|code|shadow|font|radius|spacing|tracking)/.test(k)
		],
		['Sidebar', (k) => k.startsWith('sidebar')],
		['Charts', (k) => k.startsWith('chart')],
		['Code', (k) => k.startsWith('code')],
		['Shape and type', (k) => /^(shadow|font|radius|spacing|tracking)/.test(k)]
	];
	const isColour = (v: string) => parseColour(v) !== null;
</script>

<div class="flex flex-col gap-4 text-sm">
	<div
		class="bg-muted grid grid-cols-2 gap-1 rounded-md p-1 text-xs font-medium"
		role="group"
		aria-label="Colour mode"
	>
		{#each ['light', 'dark'] as const as m (m)}
			<button
				type="button"
				aria-pressed={mode === m}
				class="rounded px-2 py-1 capitalize {mode === m
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground'}"
				onclick={() => (mode = m)}>{m}</button
			>
		{/each}
	</div>

	{#if issues.length}
		<div class="border-destructive/40 bg-destructive/5 rounded-md border p-3 text-xs" role="status">
			<p class="font-medium">{issues.length} below WCAG AA in {mode} mode</p>
			<ul class="text-muted-foreground mt-1 space-y-0.5">
				{#each issues as issue (issue.text + issue.surface)}
					<li>
						<span class="font-mono">{issue.text}</span> on
						<span class="font-mono">{issue.surface}</span>:
						{issue.ratio}:1, needs {issue.min}:1
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<p class="text-muted-foreground text-xs">
		Edited tokens are marked. A guided control replaces an edit only for the tokens it changes.
		Clear a field to follow the controls again.
	</p>

	{#each groups as [title, test] (title)}
		{@const entries = Object.entries(shown).filter(([k]) => test(k))}
		{#if entries.length}
			<section>
				<h3 class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
					{title}
				</h3>
				<div class="flex flex-col gap-1.5">
					{#each entries as [key, value] (key)}
						<label class="flex items-center gap-2 text-xs">
							<span
								class="border-border size-4 shrink-0 rounded border"
								style={isColour(value) ? `background: ${value}` : ''}
								aria-hidden="true"
							></span>
							<span class="flex w-40 shrink-0 items-center gap-1 truncate font-mono">
								<span class={key in edited ? 'text-primary font-medium' : ''}>{key}</span>
								{#if flagged.has(key)}<span class="text-destructive" title="Below WCAG AA">●</span
									>{/if}
							</span>
							<input
								{value}
								aria-label="{key} ({mode})"
								onchange={(e) => builder.setToken(mode, key, e.currentTarget.value)}
								class="border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded border px-1.5 py-0.5 font-mono outline-none focus-visible:ring-2"
							/>
							{#if key in edited}
								<button
									type="button"
									class="text-muted-foreground hover:text-foreground"
									aria-label="Undo the edit to {key}"
									onclick={() => builder.clearToken(mode, key)}>↺</button
								>
							{/if}
						</label>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
</div>
