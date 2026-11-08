<script lang="ts">
	// The theme builder's preview: one fixed docs page built from the shell's
	// real pieces (header, sidebar, breadcrumbs, prose, Shiki code, components,
	// TOC, footer) with static content. The builder iframes it once per colour
	// mode and posts the theme in; the root layout applies it. Nothing here
	// navigates or saves: every click is swallowed, so a button in the preview
	// can't dismiss the real site's announcement or switch its colour mode.
	// The shell's own parts, the ones an override can wrap, placed in the same
	// frames the docs layout gives them.
	import { DocsShell, Sidebar, PageHeader, TableOfContents } from 'svelte-docsmith';
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
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:document onclickcapture={inert} />

<DocsShell layout="page" pattern seo={{ title: 'Theme preview' }}>
	<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
		<aside class="sticky top-24 hidden h-screen w-56 shrink-0 lg:block">
			<div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4">
				<Sidebar {nav} />
			</div>
		</aside>
		<div class="min-w-0 flex-1 py-6 lg:py-0">
			<PageHeader
				path={here}
				breadcrumbs={[{ title: 'Getting started', url: '/' }, { title: 'Quick start' }]}
				readingMinutes={3}
				copyPage={false}
			/>
			<Content />
		</div>
		<div class="hidden w-56 shrink-0 lg:block">
			<div class="sticky top-24">
				<TableOfContents items={toc} activeId="configure" />
			</div>
		</div>
	</div>
</DocsShell>
