<!--
@component
The pages of a section as cards, in the order the sidebar lists them: each
page's title, description and link. Without `section`, it lists the section the
page is in, leaving out the page itself.
-->
<script lang="ts">
	import { DEV } from 'esm-env';
	import { findDocsPage } from '../docs-page-context.js';
	import { sectionCards } from '#lib/core/section-cards.js';
	import Card from './card.svelte';
	import CardGrid from './card-grid.svelte';

	const {
		section
	}: {
		/**
		 * The section to list, as a page names it in its `section` frontmatter:
		 * `'Components'`, or `['Guides', 'Advanced']` for a nested one. Defaults
		 * to the page's own section. One level is listed; a subsection is one card.
		 */
		section?: string | string[];
	} = $props();

	const page = findDocsPage();
	if (DEV && !page) {
		console.warn('[svelte-docsmith] <SectionCards> lists pages only inside <DocsShell>.');
	}

	const cards = $derived.by(() => {
		if (!page) return [];
		const { scopedContent, entry } = page.view;
		return sectionCards(scopedContent, section ?? entry?.section, entry?.path);
	});
</script>

{#if cards.length}
	<CardGrid>
		{#each cards as card (card.href)}
			<Card title={card.title} href={card.href}>
				{#if card.description}{card.description}{/if}
			</Card>
		{/each}
	</CardGrid>
{/if}
