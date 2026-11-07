<script lang="ts">
	// PROTOTYPE — throwaway. The theme builder's preview: one fixed docs page
	// built from the shell's real pieces (header, sidebar, breadcrumbs, prose,
	// Shiki code blocks, components, TOC, footer) with static content and no
	// navigation. The builder iframes it once per colour mode and posts the
	// theme in (see routes/+layout.svelte).
	import { DocsShell } from 'svelte-docsmith';
	import DocsSidebar from '$docsmith/components/layouts/docs-sidebar.svelte';
	import Breadcrumbs from '$docsmith/components/layouts/breadcrumbs.svelte';
	import TableOfContents from '$docsmith/components/chrome/table-of-contents.svelte';
	import Content from '#lib/prototype-theme-builder/preview-content.md';

	const here = '/themes/preview';
	const nav = [
		{
			title: 'Getting started',
			items: [
				{ title: 'Introduction', url: '/#introduction' },
				{ title: 'Quick start', url: here },
				{ title: 'Installation', url: '/#installation' }
			]
		},
		{
			title: 'Components',
			items: [
				{ title: 'Button', url: '/#button' },
				{ title: 'Dialog', url: '/#dialog' },
				{
					title: 'Forms',
					items: [
						{ title: 'Input', url: '/#input' },
						{ title: 'Select', url: '/#select' }
					]
				},
				{ title: 'Tabs', url: '/#tabs' }
			]
		},
		{
			title: 'Guides',
			items: [
				{ title: 'Theming', url: '/#theming' },
				{ title: 'Accessibility', url: '/#a11y' }
			]
		}
	];
	const toc = [
		{ id: 'install', title: 'Install', depth: 2 as const },
		{ id: 'configure', title: 'Configure', depth: 2 as const },
		{ id: 'your-first-component', title: 'Your first component', depth: 2 as const },
		{ id: 'options', title: 'Options', depth: 2 as const }
	];

	// A preview, not a site: links go nowhere.
	function inert(e: MouseEvent) {
		const a = (e.target as HTMLElement).closest('a');
		if (a) e.preventDefault();
	}
</script>

<svelte:document onclickcapture={inert} />

<DocsShell layout="page" pattern seo={{ title: 'Theme preview' }}>
	<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
		<DocsSidebar {nav} />
		<div class="min-w-0 flex-1 py-6 lg:py-0">
			<div class="flex items-start justify-between gap-4">
				<Breadcrumbs items={[{ title: 'Getting started', url: '/' }, { title: 'Quick start' }]} />
				<span class="text-muted-foreground text-sm whitespace-nowrap">3 min read</span>
			</div>
			<Content />
		</div>
		<div class="hidden w-56 shrink-0 lg:block">
			<TableOfContents items={toc} activeId="configure" />
		</div>
	</div>
</DocsShell>
