<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import { Badge, Callout, Card, Kbd, Step, Steps, TabItem, Tabs } from 'svelte-docsmith';

	// A "kitchen sink" of real components. It sets no theme tokens of its own —
	// it renders with whatever theme is active on the site, so switching the site
	// theme (via the /themes picker) re-skins everything here live.
	const charts = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
	const barHeights = ['58%', '84%', '44%', '96%', '70%'];
	const swatches = [
		['primary', 'Primary'],
		['secondary', 'Secondary'],
		['accent', 'Accent'],
		['muted', 'Muted'],
		['destructive', 'Destructive'],
		['border', 'Border']
	];
</script>

<div class="gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
	<!-- Buttons -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Buttons</p>
		<div class="flex flex-wrap gap-2">
			<button
				class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
			>
				Primary
			</button>
			<button
				class="bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
				>Secondary</button
			>
			<button
				class="border-border bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-medium"
				>Outline</button
			>
			<button
				class="hover:bg-accent hover:text-accent-foreground text-foreground rounded-md px-3 py-1.5 text-sm font-medium"
				>Ghost</button
			>
			<button
				class="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
				>Delete</button
			>
		</div>
	</div>

	<!-- Form -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Form</p>
		<label class="text-foreground mb-1.5 block text-xs font-medium" for="tp-email">Email</label>
		<div class="relative">
			<Search
				class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
			/>
			<input
				id="tp-email"
				placeholder="you@example.com"
				class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:outline-none"
			/>
		</div>
		<button
			class="bg-primary text-primary-foreground mt-3 w-full rounded-md py-1.5 text-sm font-medium shadow-sm"
			>Subscribe</button
		>
	</div>

	<!-- Badges + Kbd -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Badges &amp; keys</p>
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="primary">New</Badge>
			<Badge variant="default">Default</Badge>
			<Badge variant="success">Stable</Badge>
			<Badge variant="warning">Beta</Badge>
			<Badge variant="danger">Deprecated</Badge>
		</div>
		<div class="text-muted-foreground mt-3 flex items-center gap-1.5 text-sm">
			Press <Kbd>⌘</Kbd>
			<Kbd>K</Kbd> to search
		</div>
	</div>

	<!-- Chart -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Chart palette</p>
		<div class="flex h-28 items-end gap-2">
			{#each charts as c, i (c)}
				<div
					class="flex-1 rounded-t-sm"
					style="background: var(--{c}); height: {barHeights[i]}"
				></div>
			{/each}
		</div>
	</div>

	<!-- Callout -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Callout</p>
		<Callout variant="tip" title="Tip">Callouts sit on the theme's surface and text colors.</Callout
		>
	</div>

	<!-- Tabs -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Tabs</p>
		<Tabs>
			<TabItem label="Preview"
				><p class="text-muted-foreground pt-1 text-sm">A live, themed tab panel.</p></TabItem
			>
			<TabItem label="Code"
				><p class="text-muted-foreground pt-1 text-sm">The other side.</p></TabItem
			>
		</Tabs>
	</div>

	<!-- Steps -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Steps</p>
		<Steps>
			<Step title="Install">Add the package.</Step>
			<Step title="Configure">Wire the pipeline.</Step>
		</Steps>
	</div>

	<!-- Linkable card -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Card</p>
		<Card title="Quick Start" href="/docs/quick-start">
			{#snippet icon()}<Star class="size-5" />{/snippet}
			A linkable card with a hover state.
		</Card>
	</div>

	<!-- Palette -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Palette</p>
		<div class="grid grid-cols-3 gap-2">
			{#each swatches as [token, label] (token)}
				<div>
					<span
						class="ring-border block h-9 w-full rounded-md ring-1"
						style="background: var(--{token})"
					></span>
					<span class="text-muted-foreground mt-1 block text-[0.65rem]">{label}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Typography -->
	<div class="bg-card border-border rounded-lg border p-4">
		<p class="text-card-foreground mb-3 text-sm font-semibold">Typography</p>
		<h4 class="text-foreground text-base font-semibold tracking-tight">The quick brown fox</h4>
		<p class="text-muted-foreground mt-1 text-sm">
			Body copy in the muted tone, with an
			<a href="/docs/theming" class="text-primary underline underline-offset-2">inline link</a>
			and <code class="bg-muted rounded px-1 py-0.5 font-mono text-[0.8em]">inline code</code>.
		</p>
	</div>
</div>
