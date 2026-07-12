<script lang="ts">
	import type { DocsmithConfig } from '$lib/core/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';

	const { config }: { config: DocsmithConfig } = $props();
	const footer = $derived(config.footer);
	// Attribution is on by default; consumers opt out with `footer.poweredBy: false`.
	const poweredBy = $derived(footer?.poweredBy ?? true);
	const hasColumns = $derived(!!footer?.columns?.length);
</script>

{#if footer}
	<footer class="border-border/60 mt-16 border-t">
		<div class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
			{#if hasColumns}
				<div class="mb-10 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-8">
					{#each footer.columns! as column (column.title)}
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

			<div
				class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between {hasColumns
					? 'border-border/60 border-t pt-8'
					: ''}"
			>
				{#if footer.copyright}
					<p class="text-muted-foreground text-sm">{footer.copyright}</p>
				{/if}

				{#if poweredBy}
					<a
						href="https://github.com/geodask/svelte-docsmith"
						target="_blank"
						rel="noopener noreferrer"
						class="group text-muted-foreground hover:text-foreground inline-flex items-center gap-2 self-start text-sm transition-colors sm:self-auto"
					>
						<span
							class="bg-primary/10 text-primary group-hover:bg-primary/20 flex size-5 items-center justify-center rounded-md transition-colors"
						>
							<BookOpenText class="size-3" />
						</span>
						<span>Powered by <span class="text-foreground font-medium">Svelte DocSmith</span></span>
					</a>
				{/if}
			</div>
		</div>
	</footer>
{/if}
