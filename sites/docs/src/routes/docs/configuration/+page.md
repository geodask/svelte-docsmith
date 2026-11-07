---
title: Configuration
description: Package exports, the docsmith() options, and the two shell components.
section: Getting Started
order: 4
---

<script>
	import { PropsTable, Prop, Callout } from 'svelte-docsmith';
</script>

Everything you wire up once: what the package exports, the one `docsmith()` call
that configures the whole site, and the two page-level components that own the
site chrome. Props
for the authoring components (`Callout`, `Tabs`, `Badge`, and the rest) live on
their own pages in the [Components](/docs/components/callout) section.

## Package exports

- **`svelte-docsmith`**: every component, plus `createSearchEngine` and the types. Components are documented in [Components](/docs/components/callout); the rest is below.
- **`svelte-docsmith/server`**: ready route handlers for the files a site serves besides its pages: `sitemap`, `changelogFeed`, `llmsTxt`, `llmsFullTxt`, `agentMarkdown` (the `.md` page twins) and `mcpServer`. Each is one line in a `+server.ts` that reads your site config itself (see [SEO](/docs/seo), [Changelog](/docs/changelog) and [MCP server](/docs/mcp-server)). Server-only.
- **`svelte-docsmith/vite`**: the `docsmith()` Vite plugin, the one place a site is configured. It compiles markdown pages, builds the content, search, llms and changelog indexes, and serves the `?source` and `?props` imports.
- **`svelte-docsmith/site`**: your site config, the `site` options of `docsmith()`, exported as `site`, with the resolved [outside paths](/docs/links#outside-paths) as `outside`. `DocsShell`, `ErrorPage` and the route handlers read it themselves; import it when a page of your own needs the title or links.
- **`svelte-docsmith/content`**: the generated sidebar index. Its `content` export (the pages as `docs` plus the version manifest as `versions`) is what `DocsShell` and `ErrorPage` take.
- **`svelte-docsmith/search`**: the generated full-text search index, exported as `docs` (lazy-load it; see [Search](/docs/search)).
- **`svelte-docsmith/llms`**: the generated per-page agent markdown index, with props tables and example code written out, exported as `docs` (see [SEO](/docs/seo)).
- **`svelte-docsmith/changelog`**: the generated release index, exported as `releases`, with the route it is served at as `changelogPath` (see [Changelog](/docs/changelog)).
- **`svelte-docsmith/mermaid`**: the diagram component, imported for you by a ` ```mermaid ` fence. You never import it directly.
- **`svelte-docsmith/theme.css`**: the base style contract.
- **`svelte-docsmith/themes/*.css`**: the pre-installed theme presets (see [Theming](/docs/theming)).

## docsmith()

From `svelte-docsmith/vite`, added to `plugins` in `vite.config.ts` before
`sveltekit()`. It is the only place your docs are configured: it compiles your
markdown pages, scans them into the generated indexes, serves the `?source`
imports that [Live Examples](/docs/live-examples) use and the `?props` imports
behind generated [Props Tables](/docs/components/props-table), and serves your
site config to the shell and the route handlers. Only `site.title` is required.

```ts title="vite.config.ts"
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [
		docsmith({
			site: {
				title: 'My Library',
				description: 'A short tagline, used as the default meta description.',
				url: 'https://my-library.dev',
				github: 'https://github.com/you/my-library'
			},
			markdown: { lineNumbers: true }
		}),
		tailwindcss(),
		sveltekit({ extensions: ['.svelte', '.md'], adapter: adapter() })
	]
});
```

The options are checked when Vite starts, so a mistyped option fails `dev` and
`build` with a message that names it. Because they live in `vite.config.ts`,
editing them restarts the dev server.

<PropsTable title="docsmith()">
	<Prop name="site" type="DocsmithSite" required>
		The site config: title, links, SEO defaults. See <a href="#site">site</a> below.
	</Prop>
	<Prop name="content" type="string" default="'src/routes/docs'">
		Directory scanned for doc pages.
	</Prop>
	<Prop name="routes" type="string" default="'src/routes'">
		Routes root, used to derive each page's URL from its location.
	</Prop>
	<Prop name="versions" type="DocsVersions">
		The current version and the archived ones. See <a href="/docs/versioning">Versioning</a>.
		Experimental.
	</Prop>
	<Prop name="themes" type={'{ light: string; dark: string }'} default="github-light / github-dark">
		Shiki themes for every code block: markdown fences and the source panels of
		<a href="/docs/live-examples">Live Examples</a> alike.
	</Prop>
	<Prop name="markdown" type="DocsmithMarkdownOptions">
		How markdown pages are compiled. See <a href="#markdown">markdown</a> below.
	</Prop>
	<Prop name="changelog" type={'{ file?: string; path?: string } | false'}>
		Where the changelog comes from and where it is served. <code>file</code> is the
		changelog that feeds the release index (default <code>'CHANGELOG.md'</code>; point
		it at the package you publish). <code>path</code> is the route it is served at
		(default <code>'/changelog'</code>): the feed from <code>changelogFeed()</code> links
		there, and hand-written per-release pages are found under it. <code>false</code>
		skips the changelog.
	</Prop>
	<Prop name="tsconfig" type="string" default="'tsconfig.json'">
		The tsconfig used to read prop types for <code>?props</code> imports, relative to
		the Vite root. Experimental.
	</Prop>
	<Prop name="schema" type="StandardSchemaV1">
		A schema for your pages' custom fields: Zod, Valibot, ArkType or any other
		<a href="https://standardschema.dev">Standard Schema</a>. The built-in fields are
		checked with or without one. See
		<a href="/docs/writing-pages#validating-frontmatter">Validating frontmatter</a>.
	</Prop>
	<Prop name="links" type="DocsmithLinksOptions">
		How the links doc pages write are checked, and which paths something other than
		this app serves. See <a href="#links">links</a> below.
	</Prop>
</PropsTable>

### site

What the header, footer and head tags show. The plugin serves it as
`svelte-docsmith/site`, where `DocsShell`, `ErrorPage` and the
[route handlers](/docs/seo) read it, so you never pass it around. It reaches the
browser as JSON, so it must be plain data: strings, numbers, booleans, arrays
and plain objects.

<PropsTable title="site">
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
	<Prop name="mcp" type="string">
		Path of your <a href="/docs/mcp-server">MCP server</a>, e.g. <code>/mcp</code>, or a
		full URL. Adds “Connect to your editor” to the copy-page menu. Experimental.
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

This site runs one: the thin bar above the header is `site.announcement`. Its
`id` tracks the library version, so it returns after each release and stays out
of the way in between. Dismiss it and it holds until the next version.

A page of your own can read the same config, for example a landing page that
shows the site title:

```svelte
<script lang="ts">
	import { site } from 'svelte-docsmith/site';
</script>

<h1>{site.title}</h1>
```

### markdown

How markdown pages are compiled. The plugin runs mdsvex, Shiki, heading anchors
and the page layout over every `.md` file before SvelteKit compiles it, so
markdown pages are real routes and there is no preprocessor to register. Every
option has a working default.

<PropsTable title="markdown">
	<Prop name="extensions" type="string[]" default="['.md']">
		File extensions compiled as markdown. SvelteKit has to route them too, so list
		the same extensions in <code>sveltekit({'{ extensions }'})</code>; the plugin warns
		when one is missing.
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
		peer dependencies; see <a href="/docs/code-blocks">Code blocks</a>.
	</Prop>
	<Prop name="remarkPlugins" type="PluggableList">
		Extra remark plugins, appended after DocSmith's own.
	</Prop>
	<Prop name="rehypePlugins" type="PluggableList">
		Extra rehype plugins, appended after DocSmith's own (slug, sectionize).
	</Prop>
</PropsTable>

### links

How the links your doc pages write are treated. `vite build` checks every link
to a path under the docs base and, by default, fails on one with no page or
anchor behind it. See [Links](/docs/links) for what counts as a broken link and
a worked example of outside paths.

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Library' },
	links: { broken: 'warn', outside: ['/playground'] }
});
```

<PropsTable title="links">
	<Prop name="broken" type="'error' | 'warn' | 'ignore'" default="'error'">
		What a broken link does to <code>vite build</code>: <code>'error'</code> prints
		every one and fails, <code>'warn'</code> prints them and builds,
		<code>'ignore'</code> skips the check. <code>vite dev</code> only ever warns.
	</Prop>
	<Prop name="outside" type="string[]" default="[]">
		Outside paths: same-origin path prefixes that something other than this app
		serves, like a Worker or a reverse proxy. Each starts with <code>/</code> and
		matches whole segments. A link to one is never broken, and doc pages and the
		shell's site config links mark it <code>rel="external"</code>. See
		<a href="/docs/links#outside-paths">Outside paths</a>.
	</Prop>
</PropsTable>

## DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {content}>
	{@render children()}
</DocsShell>
```

It reads the site config from `svelte-docsmith/site` itself.

<PropsTable>
	<Prop name="content" type="DocsContent" required>
		The <code>content</code> export of <code>svelte-docsmith/content</code>: every page,
		which the sidebar is derived from, and the version manifest, which scopes the
		sidebar, search, prev/next and breadcrumbs to the version being read (see
		<a href="/docs/versioning">Versioning</a>). A bare <code>docs</code> array still works.
	</Prop>
	<Prop name="children" type="Snippet" required>
		The rendered page.
	</Prop>
	<Prop name="versions" type="ResolvedVersion[]" default="[]" deprecated>
		Only read when <code>content</code> is a bare <code>docs</code> array. Pass the
		<code>content</code> export instead, which carries the versions.
	</Prop>
	<Prop name="search" type="(versionId?: string) => Promise<SearchDoc[]>">
		Enable the ⌘K search palette by lazily providing the generated index, e.g.
		<code>{'() => import(\'svelte-docsmith/search\').then((m) => m.docs)'}</code>.
		Receives the active version id on a versioned site.
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
		endpoint. See <a href="/docs/seo">SEO</a>. With <code>site.mcp</code> set, it also
		offers “Connect to your editor”.
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
	import { content } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
</script>

<ErrorPage {content} home="/docs" homeLabel="Back to the docs" />
```

Like `DocsShell`, it reads the site config itself, so the chrome matches.

<PropsTable>
	<Prop name="content" type="DocsContent">
		Same <code>content</code> as <code>DocsShell</code>, so the header and footer nav
		still work, and an error under an archived prefix keeps that version's search
		scope and <code>noindex</code>.
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
	<Prop name="versions" type="ResolvedVersion[]" default="[]" deprecated>
		Only read when <code>content</code> is a bare <code>docs</code> array, as for
		<code>DocsShell</code>.
	</Prop>
	<Prop name="search" type="(versionId?: string) => Promise<SearchDoc[]>">
		Enable the ⌘K palette on the error page (same loader as <code>DocsShell</code>).
	</Prop>
</PropsTable>

## Types

- **`DocsmithSite`**: the `site` options above, as `svelte-docsmith/site` serves them.
- **`DocsmithOptions`** / **`DocsmithMarkdownOptions`** / **`DocsmithChangelogOptions`** /
  **`DocsmithLinksOptions`** / **`BrokenLinksLevel`**: the options of `docsmith()`,
  from `svelte-docsmith/vite`.
- **`DocsContentItem`**: a content-index entry with `title`, `path`, and optional
  `section`, `order`, `description`, `toc`, and `data`.
- **`DocsCustomFields`**: the type of `data`, a page's custom fields. Extend it
  to type yours. See [Custom fields](/docs/writing-pages#custom-fields).
- **`SearchDoc`** / **`SearchResult`** / **`SearchEngine`**: the search index
  entry and the shape returned by [`createSearchEngine`](/docs/search).
- **`ResolvedVersion`**: one entry of the generated version manifest. See
  [Versioning](/docs/versioning).
- **`DocsContent`**: the `content` export, `{ docs, versions }`, that `DocsShell`
  and `ErrorPage` take.
- **`SitemapOptions`** / **`SitemapEntry`**: what `sitemap()` in
  `svelte-docsmith/server` takes.
- **`CalloutVariant`** / **`BadgeVariant`**: the intent unions for `Callout` and `Badge`.

The vendored shadcn primitives and internal helpers (the TOC engine, the
clipboard utility, the markdown renderer map) are **not** part of the public API
and may change between releases.
