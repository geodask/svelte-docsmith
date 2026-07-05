<script lang="ts">
	import type { DocsmithConfig } from '$lib/config.js';

	const { config }: { config: DocsmithConfig } = $props();
	const footer = $derived(config.footer);
</script>

{#if footer}
	<footer class="border-border/60 mt-16 border-t">
		<div class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
			{#if footer.columns?.length}
				<div class="mb-8 grid gap-8 grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
					{#each footer.columns as column (column.title)}
						<div>
							<p class="mb-3 text-sm font-semibold">{column.title}</p>
							<ul class="space-y-2">
								{#each column.links as link (link.href)}
									<li>
										<a
											href={link.href}
											target={link.external ? '_blank' : undefined}
											rel={link.external ? 'noopener noreferrer' : undefined}
											class="text-muted-foreground hover:text-foreground text-sm transition-colors"
										>
											{link.label}
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{/if}

			{#if footer.copyright}
				<p class="text-muted-foreground text-sm">{footer.copyright}</p>
			{/if}
		</div>
	</footer>
{/if}
