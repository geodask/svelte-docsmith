<script lang="ts">
	import { page } from '$app/state';
	import type { DocsContent, DocsContentItem, ResolvedVersion } from '#lib/core/index.js';
	import type { SearchLoader } from '#lib/search/session.svelte.js';
	import DocsShell from './docs-shell.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { Snippet } from 'svelte';

	const {
		content = [],
		versions = [],
		search,
		status,
		title,
		message,
		home = '/',
		homeLabel = 'Back to home',
		pattern = true,
		children
	}: {
		/**
		 * The `content` export of `svelte-docsmith/content`, as for `DocsShell`, so
		 * the error page keeps the site's header and footer, and an error under an
		 * archived prefix keeps that version's search scope, switcher and `noindex`.
		 */
		content?: DocsContent | DocsContentItem[];
		/** @deprecated Pass the `content` export instead, as for `DocsShell`. */
		versions?: ResolvedVersion[];
		/** Enable the ⌘K search palette on the error page (same loader as DocsShell). */
		search?: SearchLoader;
		/** HTTP status; defaults to the current `page.status`. */
		status?: number;
		/** Heading; defaults to a message keyed off the status. */
		title?: string;
		/** Body line; defaults to the error message, or a status-appropriate default. */
		message?: string;
		/** Where the primary action links. Default: the site root. */
		home?: string;
		homeLabel?: string;
		/** Render the decorative page background. Default: `true`. */
		pattern?: boolean;
		/** Extra content below the action (e.g. a search prompt or links). */
		children?: Snippet;
	} = $props();

	const resolvedStatus = $derived(status ?? page.status);
	const isNotFound = $derived(resolvedStatus === 404);
	const resolvedTitle = $derived(title ?? (isNotFound ? 'Page not found' : 'Something went wrong'));
	const resolvedMessage = $derived(
		message ??
			page.error?.message ??
			(isNotFound
				? "The page you're looking for doesn't exist or has moved."
				: 'An unexpected error occurred. Please try again.')
	);
</script>

<DocsShell {content} {versions} {search} {pattern} layout="page" seo={{ title: resolvedTitle }}>
	<section
		class="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center md:px-6"
	>
		<p class="text-primary font-mono text-sm font-semibold tracking-widest tabular-nums">
			{resolvedStatus}
		</p>
		<h1 class="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
			{resolvedTitle}
		</h1>
		<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
			{resolvedMessage}
		</p>

		<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
			<a
				href={home}
				class="group bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-lg px-6 font-medium shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
			>
				<ArrowLeft class="size-4 transition-transform group-hover:-translate-x-0.5" />
				{homeLabel}
			</a>
		</div>

		{#if children}
			<div class="mt-8">
				{@render children()}
			</div>
		{/if}
	</section>
</DocsShell>
