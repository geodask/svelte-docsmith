<script lang="ts">
	// The theme builder's preview: one fixed docs page built from the shell's
	// real pieces (header, sidebar, breadcrumbs, prose, Shiki code, components,
	// TOC, footer) with static content. The builder iframes it once per colour
	// mode and posts the theme in; the root layout applies it. Nothing here
	// navigates or saves: every click is swallowed, so a button in the preview
	// can't dismiss the real site's announcement or switch its colour mode.
	// The header's mode toggle asks the builder to switch its view instead.
	import { DocsShell } from 'svelte-docsmith';
	// Not public exports: imported from the package source through the
	// `$docsmith` alias, so the preview uses the real components without
	// widening the package's API.
	import DocsSidebar from '$docsmith/components/layouts/docs-sidebar.svelte';
	import Breadcrumbs from '$docsmith/components/layouts/breadcrumbs.svelte';
	import TableOfContents from '$docsmith/components/chrome/table-of-contents.svelte';
	import Content from '#lib/theme-builder/preview-content.md';

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
				{ title: 'Accessibility', url: '/#accessibility' }
			]
		}
	];
	const toc = [
		{ id: 'install', title: 'Install', depth: 2 as const },
		{ id: 'configure', title: 'Configure', depth: 2 as const },
		{ id: 'your-first-component', title: 'Your first component', depth: 2 as const },
		{ id: 'options', title: 'Options', depth: 2 as const }
	];

	function inert(e: MouseEvent) {
		const target = (e.target as HTMLElement).closest('a, button, summary');
		if (!target) return;
		e.preventDefault();
		e.stopPropagation();
		if (target.matches('button[aria-label^="Switch to"]') && window.parent !== window) {
			const dark = !document.documentElement.classList.contains('dark');
			window.parent.postMessage({ type: 'docsmith-preview-mode', dark }, location.origin);
		}
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

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
