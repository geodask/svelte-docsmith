<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
</script>

<DocsShell
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	{content}
	layout="page"
	pattern
	seo={{
		title: 'Privacy',
		description: 'What this documentation site measures, and what it doesn’t.'
	}}
>
	<article class="prose dark:prose-invert mx-auto max-w-3xl px-4 py-16 md:px-6 lg:py-20">
		<h1>Privacy</h1>
		<p class="lead">
			This site measures how the docs are used so they can get better. It sets no cookies, shows no
			ads and doesn’t track you across other sites.
		</p>

		<h2>What we measure</h2>
		<p>
			We use <a href="https://posthog.com" rel="noopener">PostHog</a>, hosted in the EU (Frankfurt),
			in its cookieless mode. Each visit sends:
		</p>
		<ul>
			<li>the pages you view and how long you stay on them;</li>
			<li>
				clicks on buttons and links, such as copying code or a page, opening a page in an AI
				assistant, or copying the setup for connecting your editor;
			</li>
			<li>
				what you type into search, how many results it found and which one you opened, if any;
			</li>
			<li>
				your “Was this page helpful?” vote, if you give one, and whether you then chose to edit the
				page or open an issue;
			</li>
			<li>
				visits to pages that don’t exist, with the page that linked there, so we can fix broken
				links;
			</li>
			<li>your browser, device type, referring site and page load performance.</li>
		</ul>
		<p>
			To count unique visitors without cookies, PostHog combines your IP address, browser, the date
			and this site into a one-way hash on its servers, then discards the IP address. The hash
			changes every day, so you can’t be recognised from one day to the next, and nothing is stored
			on your device for analytics.
		</p>

		<h2>What stays in your browser</h2>
		<p>
			The site remembers a few preferences in your browser’s local storage: your theme and light or
			dark mode, themes you build in the theme builder, which code tabs you picked, announcements
			you dismissed, and the GitHub star count for a day. None of it is sent anywhere.
		</p>

		<h2>Questions</h2>
		<p>
			Open an issue on <a href="https://github.com/geodask/svelte-docsmith/issues" rel="noopener"
				>GitHub</a
			> if you have a question about this page or want something removed.
		</p>
		<p class="text-sm">Last updated November 9, 2026.</p>
	</article>
</DocsShell>
