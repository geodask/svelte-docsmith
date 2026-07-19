---
title: Configuration
description: Package exports, the config object, and the two shell components.
section: Getting Started
order: 4
---

<script>
	import { PropsTable, Prop, Callout } from 'svelte-docsmith';
</script>

Everything you wire up once: what the package exports, the config object you pass
to the shell, and the two page-level components that own the site chrome. Props
for the authoring components (`Callout`, `Tabs`, `Badge`, and the rest) live on
their own pages in the [Components](/docs/components/callout) section.

## Package exports

- **`svelte-docsmith`**: every component, plus `defineConfig`, `createSearchEngine`, `generateSitemap`, `generateFeed`, `generateLlmsTxt`, `generateLlmsFullTxt`, and the types. Components are documented in [Components](/docs/components/callout); the rest is below.
- **`svelte-docsmith/preprocess`**: the mdsvex + Shiki preprocessor for `svelte.config.js`.
- **`svelte-docsmith/vite`**: the Vite plugin (content, search, llms and changelog indexes, plus the `?source` transform).
- **`svelte-docsmith/content`**: the generated sidebar index, exported as `docs`.
- **`svelte-docsmith/search`**: the generated full-text search index, exported as `docs` (lazy-load it; see [Search](/docs/search)).
- **`svelte-docsmith/llms`**: the generated per-page markdown index, exported as `docs` (see [SEO](/docs/seo)).
- **`svelte-docsmith/changelog`**: the generated release index, exported as `releases` (see [Changelog](/docs/changelog)).
- **`svelte-docsmith/mermaid`**: the diagram component, imported for you by a ` ```mermaid ` fence. You never import it directly.
- **`svelte-docsmith/theme.css`**: the base style contract.
- **`svelte-docsmith/themes/*.css`**: the pre-installed theme presets (see [Theming](/docs/theming)).

## defineConfig

Validates a `DocsmithConfig` and returns it unchanged, throwing a clear error on
an invalid or dynamically-built config instead of rendering a blank header.

```ts
const config = defineConfig({
	title: 'My Library',
	description: 'A short tagline, used as the default meta description.',
	url: 'https://my-library.dev',
	github: 'https://github.com/you/my-library',
	version: '1.0.0'
});
```

<PropsTable>
	<Prop name="title" type="string" required>
		Site title, shown in the header/sidebar and as the <code>&lt;title&gt;</code> suffix.
	</Prop>
	<Prop name="description" type="string">
		Default meta description, used for pages without their own. See <a href="/docs/seo">SEO</a>.
	</Prop>
	<Prop name="url" type="string">
		Canonical site origin. Enables <code>&lt;link rel="canonical"&gt;</code> and absolute Open Graph URLs.
	</Prop>
	<Prop name="ogImage" type="string">
		Default social-share image (absolute, or a path resolved against <code>url</code>).
	</Prop>
	<Prop name="editUrl" type="string">
		Base URL for the per-page “Edit this page” link, e.g.
		<code>https://github.com/you/repo/edit/main/apps/docs</code>. Each page's source
		path is appended. (“Last updated” is added from git automatically.)
	</Prop>
	<Prop name="github" type="string">
		GitHub URL; renders a link in the header when set.
	</Prop>
	<Prop name="version" type="string">
		Version string shown in the header.
	</Prop>
	<Prop name="logo" type="string">
		Logo image src; falls back to the built-in book mark.
	</Prop>
	<Prop name="nav" type="DocsmithLink[]">
		Top-level header navigation links.
	</Prop>
	<Prop name="announcement" type={'{ text, tag?, href?, external?, id?, dismissible? }'}>
		A thin bar above the header. <code>text</code> is required; add a
		<code>tag</code> for a leading pill (e.g. <code>"New"</code>) and an
		<code>href</code> to link it. It's dismissible by default and stays dismissed
		until you change <code>id</code> (or the text), so bump <code>id</code> to
		re-show a new announcement.
	</Prop>
	<Prop name="footer" type={'{ copyright?, columns?, poweredBy? }'}>
		Footer copyright line, titled link columns, and the “Powered by” toggle.
	</Prop>
</PropsTable>

This site runs one: the thin bar above the header is `config.announcement`. Its
`id` tracks the library version, so it returns after each release and stays out
of the way in between. Dismiss it and it holds until the next version.

## docsmith() preprocessor

From `svelte-docsmith/preprocess`, registered in `svelte.config.js`. It bundles
mdsvex, Shiki, heading anchors and the page layout, so markdown compiles to real
routes. Every option has a working default; pass none and it does the right
thing.

<PropsTable title="docsmith() — preprocess">
	<Prop name="extensions" type="string[]" default="['.md']">
		File extensions compiled as markdown.
	</Prop>
	<Prop name="themes" type={'{ light: string; dark: string }'} default="github-light / github-dark">
		Shiki themes for the dual light/dark render.
	</Prop>
	<Prop name="langs" type="string[]">
		Extra Shiki languages on top of the built-in set. An unknown fence language
		falls back to plain text rather than failing the build.
	</Prop>
	<Prop name="layout" type="string | false">
		Absolute path to a custom mdsvex layout, or <code>false</code> for none. A
		custom layout must export a <code>pre</code> component from its module
		script, since code fences render through it.
	</Prop>
	<Prop name="lineNumbers" type="boolean" default="false">
		Number every code block. A fence overrides it either way with
		<code>showLineNumbers</code> or <code>noLineNumbers</code>.
	</Prop>
	<Prop name="twoslash" type="boolean" default="false">
		Enable Twoslash on fences marked <code>twoslash</code>. Needs the optional
		peer dependencies; see [Code blocks](/docs/code-blocks).
	</Prop>
	<Prop name="remarkPlugins" type="PluggableList">
		Extra remark plugins, appended after DocSmith's own.
	</Prop>
	<Prop name="rehypePlugins" type="PluggableList">
		Extra rehype plugins, appended after DocSmith's own (slug, sectionize).
	</Prop>
</PropsTable>

## docsmith() Vite plugin

From `svelte-docsmith/vite`, added to `plugins` in `vite.config.ts`. It scans
your pages into the generated indexes and serves the `?source` imports that
[Live Examples](/docs/live-examples) use.

<PropsTable title="docsmith() — vite">
	<Prop name="content" type="string" default="'src/routes/docs'">
		Directory scanned for doc pages.
	</Prop>
	<Prop name="routes" type="string" default="'src/routes'">
		Routes root, used to derive each page's URL from its location.
	</Prop>
	<Prop name="themes" type={'{ light: string; dark: string }'} default="github-light / github-dark">
		Shiki themes for the <code>?source</code> render.
	</Prop>
	<Prop name="changelog" type="string | false" default="'CHANGELOG.md'">
		Path to the changelog that feeds the release index. Point it at the package
		you publish, or <code>false</code> to skip it.
	</Prop>
	<Prop name="changelogPath" type="string" default="'/changelog'">
		Route the changelog is served at. Used to build feed links and to find
		hand-written per-release pages.
	</Prop>
</PropsTable>

## DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

<PropsTable>
	<Prop name="config" type="DocsmithConfig" required>
		The site config (see <code>defineConfig</code> above).
	</Prop>
	<Prop name="content" type="DocsContentItem[]" required>
		The content index; the sidebar nav is derived from it.
	</Prop>
	<Prop name="children" type="Snippet" required>
		The rendered page.
	</Prop>
	<Prop name="search" type="() => Promise<SearchDoc[]>">
		Enable the ⌘K search palette by lazily providing the generated index, e.g.
		<code>{'() => import(\'svelte-docsmith/search\').then((m) => m.docs)'}</code>.
		See <a href="/docs/search">Search</a>.
	</Prop>
	<Prop name="seo" type={'{ title?: string; description?: string }'}>
		Override the head tags for this page (title, meta description). Doc pages get
		these from frontmatter automatically. See <a href="/docs/seo">SEO</a>.
	</Prop>
	<Prop name="logo" type="Snippet">
		Custom logo mark for the header and mobile menu.
	</Prop>
	<Prop name="actions" type="Snippet">
		Extra header controls, before the theme toggle.
	</Prop>
	<Prop name="footer" type="Snippet">
		Content rendered below the page column.
	</Prop>
	<Prop name="pattern" type="boolean" default="false">
		Render the decorative grid-and-glow page background.
	</Prop>
	<Prop name="copyPage" type="boolean" default="false">
		Show the "Copy page" split button on doc pages (copy as Markdown, view the
		raw <code>.md</code>, or open in ChatGPT / Claude). Needs the <code>.md</code>
		endpoint. See <a href="/docs/seo">SEO</a>.
	</Prop>
	<Prop name="readingTime" type="boolean" default="true">
		Show the estimated reading time on doc pages (computed at build time from
		the page's word count). Set <code>false</code> to hide it.
	</Prop>
	<Prop name="feedback" type={"boolean | ((vote: 'up' | 'down', path: string) => void)"}>
		Show the "Was this page helpful?" widget at the foot of doc pages. Pass
		<code>true</code> for the UI alone, or a callback to record votes (wire it to
		your analytics). Omit to hide it.
	</Prop>
	<Prop name="layout" type="'docs' | 'page'" default="'docs'">
		<code>docs</code> is the three-column shell; <code>page</code> is full-bleed
		content with the same header and footer but no sidebar or TOC.
	</Prop>
</PropsTable>

<Callout variant="note" title="Theming needs no setup">

`ThemeProvider` and `ThemeToggle` handle light and dark with no consumer wiring.
`DocsShell` mounts the provider internally, so you never touch `mode-watcher`
yourself. Use `ThemeProvider` directly to wrap a page you build outside
`DocsShell`.

</Callout>

## ErrorPage

A styled 404 / error screen that keeps the site chrome (header, search, footer,
theme). Drop it into a SvelteKit `+error.svelte`:

```svelte title="src/routes/+error.svelte"
<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<ErrorPage config={siteConfig} content={docs} home="/docs" homeLabel="Back to the docs" />
```

<PropsTable>
	<Prop name="config" type="DocsmithConfig" required>
		Same config as <code>DocsShell</code>, so the chrome matches.
	</Prop>
	<Prop name="content" type="DocsContentItem[]" default="[]">
		Content index, so the header/footer nav still work.
	</Prop>
	<Prop name="status" type="number" default="page.status">
		HTTP status. Defaults to the current page's status.
	</Prop>
	<Prop name="title" type="string" default="from status">
		Heading. Defaults to “Page not found” for 404, else “Something went wrong”.
	</Prop>
	<Prop name="message" type="string" default="page.error.message">
		Body line. Defaults to the error message, then a status-appropriate default.
	</Prop>
	<Prop name="home" type="string" default="'/'">
		Where the primary action links.
	</Prop>
	<Prop name="homeLabel" type="string" default="'Back to home'">
		Label of the primary action.
	</Prop>
	<Prop name="search" type="() => Promise<SearchDoc[]>">
		Enable the ⌘K palette on the error page (same loader as <code>DocsShell</code>).
	</Prop>
</PropsTable>

## Types

- **`DocsmithConfig`**: the config object above.
- **`DocsContentItem`**: a content-index entry with `title`, `path`, and optional
  `section`, `order`, `description`, `toc`.
- **`SearchDoc`** / **`SearchResult`** / **`SearchEngine`**: the search index
  entry and the shape returned by [`createSearchEngine`](/docs/search).
- **`CalloutVariant`** / **`BadgeVariant`**: the intent unions for `Callout` and `Badge`.

The vendored shadcn primitives and internal helpers (the TOC engine, the
clipboard utility, the markdown renderer map) are **not** part of the public API
and may change between releases.
