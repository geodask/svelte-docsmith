<script lang="ts">
	import themeCss from 'svelte-docsmith/theme.css?raw';
	import { themes, defaultThemeSlug } from '#lib/themes-data.ts';

	// The token table, generated rather than written: every token the default
	// preset sets, plus every fallback theme.css gives, so a token added to
	// either shows up here without editing the page.
	const preset = themes.find((t) => t.slug === defaultThemeSlug) ?? themes[0];
	const fallbacks: Record<string, string> = {};
	const base = themeCss.slice(themeCss.indexOf('@layer base'));
	const root = base.match(/:root\s*\{([\s\S]*?)\n\t\}/)?.[1] ?? '';
	for (const [, name, value] of root.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
		if (name !== 'docsmith-theme') fallbacks[name] = value.trim().replace(/\s+/g, ' ');
	}
	const names = [...new Set([...Object.keys(preset.light), ...Object.keys(fallbacks)])];

	const groups: { title: string; note: string; match: (name: string) => boolean }[] = [
		{
			title: 'Surfaces and text',
			note: 'Each surface comes with a -foreground for the text on it.',
			match: (n) =>
				/^(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring)/.test(
					n
				)
		},
		{
			title: 'Sidebar',
			note: 'The docs sidebar, tokened separately.',
			match: (n) => n.startsWith('sidebar')
		},
		{
			title: 'Charts',
			note: 'A five-colour series for charts and diagrams.',
			match: (n) => n.startsWith('chart-')
		},
		{
			title: 'Code',
			note: 'Syntax colours for every code block, unless codeTheme names a Shiki pair.',
			match: (n) => n.startsWith('code-')
		},
		{ title: 'Shape and type', note: 'Corners, fonts, shadows and spacing.', match: () => true }
	];
	const grouped = groups.map((g) => ({ ...g, tokens: [] as string[] }));
	for (const name of names) grouped.find((g) => g.match(name))?.tokens.push(name);
</script>

<div class="not-prose my-6 flex flex-col gap-8">
	{#each grouped as group (group.title)}
		<section>
			<h3 class="text-foreground text-base font-semibold">{group.title}</h3>
			<p class="text-muted-foreground mt-1 text-sm">{group.note}</p>
			<div class="border-border mt-3 overflow-x-auto rounded-lg border">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-muted-foreground">
						<tr>
							<th class="px-3 py-2 font-medium">Token</th>
							<th class="px-3 py-2 font-medium">Default (Darkmatter, light)</th>
						</tr>
					</thead>
					<tbody>
						{#each group.tokens as name (name)}
							{@const value = preset.light[name] ?? fallbacks[name]}
							<tr class="border-border border-t">
								<td class="px-3 py-1.5 font-mono text-xs whitespace-nowrap">--{name}</td>
								<td class="text-muted-foreground px-3 py-1.5 font-mono text-xs">
									<span class="inline-flex items-center gap-2">
										{#if /^(oklch|hsl|var|color-mix)/.test(value)}
											<span
												class="border-border size-3 shrink-0 rounded-sm border"
												style="background: {value}"
											></span>
										{/if}
										{value}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</div>
