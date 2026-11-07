<script lang="ts">
	// PROTOTYPE — throwaway. A docs page in miniature, painted only with theme
	// tokens, so the builder previews the theme on the thing it will style.
	import { Badge, Callout } from 'svelte-docsmith';
	import Search from '@lucide/svelte/icons/search';

	let { compact = false }: { compact?: boolean } = $props();
	const nav = [
		['Getting started', ['Introduction', 'Installation', 'Quick start']],
		['Core concepts', ['Writing pages', 'Theming', 'Search']]
	] as const;
	const k = (role: string) => `color: var(--code-token-${role})`;
</script>

<div
	class="bg-background text-foreground border-border overflow-hidden rounded-xl border font-sans shadow-lg"
>
	<!-- Header -->
	<div class="border-border flex items-center gap-3 border-b px-4 py-2.5">
		<span class="bg-primary size-5 rounded-md"></span>
		<span class="text-sm font-semibold">Acme UI</span>
		<span class="text-muted-foreground hidden text-sm sm:inline">Docs</span>
		<span class="text-muted-foreground hidden text-sm sm:inline">Components</span>
		<div
			class="border-input bg-background text-muted-foreground ml-auto flex w-44 items-center gap-2 rounded-md border px-2 py-1 text-xs"
		>
			<Search class="size-3.5" /> Search docs
			<span class="bg-muted ml-auto rounded px-1 font-mono text-[10px]">⌘K</span>
		</div>
	</div>

	<div class="grid {compact ? 'grid-cols-1' : 'md:grid-cols-[180px_1fr]'}">
		<!-- Sidebar -->
		{#if !compact}
			<aside
				class="bg-sidebar text-sidebar-foreground border-sidebar-border hidden border-r p-3 text-sm md:block"
			>
				{#each nav as [section, items] (section)}
					<p class="text-muted-foreground mt-3 mb-1 px-2 text-xs font-medium first:mt-0">
						{section}
					</p>
					{#each items as item (item)}
						<p
							class="rounded-md px-2 py-1 {item === 'Theming'
								? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
								: ''}"
						>
							{item}
						</p>
					{/each}
				{/each}
			</aside>
		{/if}

		<!-- Article -->
		<article class="min-w-0 p-5 md:p-7">
			<p class="text-muted-foreground text-xs">Core concepts / Theming</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Make it yours</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				Every surface reads the theme's tokens, so one file restyles the whole site.
			</p>
			<p class="mt-4 leading-relaxed">
				Install the package, then call <code
					class="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">docsmith()</code
				>
				in your config. Read the
				<a class="text-primary font-medium underline underline-offset-4" href="#sample"
					>configuration guide</a
				> for every option.
			</p>

			<div class="mt-4">
				<Callout variant="note" title="Heads up"
					>Colour tokens have no default, so set all of them.</Callout
				>
			</div>

			<pre
				class="bg-card border-border mt-4 overflow-x-auto rounded-lg border p-4 font-mono text-[13px] leading-relaxed"><code
					><span style={k('comment')}>// vite.config.ts</span>
<span style={k('keyword')}>import</span> {'{'} docsmith {'}'} <span style={k('keyword')}>from</span
					> <span style={k('string')}>'svelte-docsmith/vite'</span>;

<span style={k('keyword')}>export default</span> <span style={k('function')}>defineConfig</span
					>({'{'}
  plugins: [<span style={k('function')}>docsmith</span>({'{'} <span style={k('parameter')}
						>theme</span
					>: <span style={k('string')}>'./src/theme.css'</span>, <span style={k('parameter')}
						>port</span
					>: <span style={k('constant')}>5173</span> {'}'})]
{'}'});</code
				></pre>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<button
					class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
					>Get started</button
				>
				<button
					class="bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
					>Secondary</button
				>
				<button
					class="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium"
					>Outline</button
				>
				<Badge variant="primary">New</Badge>
				<Badge variant="warning">Beta</Badge>
			</div>

			<div class="mt-5 grid gap-3 sm:grid-cols-2">
				<div class="bg-card text-card-foreground border-border rounded-lg border p-4 shadow-sm">
					<p class="text-sm font-semibold">Search</p>
					<p class="text-muted-foreground mt-1 text-sm">
						Instant, typo-tolerant, built at build time.
					</p>
				</div>
				<div class="bg-card text-card-foreground border-border rounded-lg border p-4 shadow-sm">
					<p class="text-sm font-semibold">Versions</p>
					<div class="mt-2 flex h-10 items-end gap-1">
						{#each [1, 2, 3, 4, 5] as i (i)}
							<span
								class="flex-1 rounded-sm"
								style="height: {30 + i * 12}%; background: var(--chart-{i})"
							></span>
						{/each}
					</div>
				</div>
			</div>
		</article>
	</div>
</div>
