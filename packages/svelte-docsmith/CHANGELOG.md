# svelte-docsmith

## 0.7.0

### Minor Changes

- 81039f0: Make Darkmatter the built-in default theme. `svelte-docsmith/theme.css` now ships the Darkmatter tokens as its base, so importing it alone gives the Darkmatter look (near-monochrome with a warm orange primary) without importing a preset. Sites that want the previous look can import `svelte-docsmith/themes/tangerine.css` after `theme.css`.

  Also fixes Darkmatter's dark-mode `destructive` token, which was a teal carried over from the source preset instead of a red, so delete buttons and error surfaces now read as errors in dark mode.

## 0.6.0

### Minor Changes

- 82e109e: Add reading time and a page-feedback widget to `DocsShell`.

  Doc pages now show an estimated reading time (computed at build time from the page's word count, in the content index as `readingTime`); toggle it with the `readingTime` prop (default `true`). The new `feedback` prop renders a "Was this page helpful?" thumbs up/down widget at the foot of each page: pass `true` for the UI alone, or a `(vote, path) => void` callback to record votes.

## 0.5.1

### Patch Changes

- a6eb3bc: Declare `@lucide/svelte` as a runtime dependency. The shipped components import icons from `@lucide/svelte/icons/*`, but it was listed only under `devDependencies`, so standalone consumers (anything outside this monorepo, including projects scaffolded with `create-svelte-docsmith`) failed to build with "failed to resolve import @lucide/svelte/icons/...". The dogfood docs site masked it because the workspace already had the package installed.

## 0.5.0

### Minor Changes

- 3e58328: Add "Edit this page" and "Last updated" to the bottom of each doc page. Set `editUrl` in your config (the GitHub edit URL for your docs directory, e.g. `https://github.com/you/repo/edit/main/apps/docs`) and each page links to its own source. The "Last updated" date is read from each page's last git commit automatically, no config needed. Both sit just above the prev/next navigation.
- 16ac514: Add llms.txt and "Copy page" support for AI tooling.

  The `docsmith()` plugin now emits a `svelte-docsmith/llms` module with each page's full markdown. Two framework-agnostic helpers, `generateLlmsTxt` and `generateLlmsFullTxt`, turn it into the `llms.txt` index and `llms-full.txt` corpus defined by the llmstxt.org standard, both following the sidebar reading order (grouped by `section`, sorted by `order`). Wire them into `src/routes/llms.txt/+server.ts` and `src/routes/llms-full.txt/+server.ts`.

  A new `copyPage` prop on `DocsShell` adds a "Copy page" split button to doc pages: copy the page as Markdown, view the raw `.md`, or open it in ChatGPT / Claude. Back it with a catch-all `src/routes/[...slug].md/+server.ts` over the same `svelte-docsmith/llms` index. See the SEO docs page.

- 914cacc: Add a `generateSitemap` helper that builds a `sitemap.xml` body from the content index. Wire it into a `src/routes/sitemap.xml/+server.ts` and each doc page is listed with a `<lastmod>` from its last git commit. Pair it with a `static/robots.txt` pointing at the sitemap. See the SEO docs page.

### Patch Changes

- e8a1b4e: Accessibility pass on the shell: add a "Skip to content" link (visible on keyboard focus) that jumps to the main content, give `<main>` an id and focus target, and label the sidebar, header, mobile, and pagination navs so screen readers can tell the landmarks apart.
- ab3536f: Normalize trailing slashes when matching the current route. `/docs/intro/` and `/docs/intro` now resolve to the same page, so the SEO tags, "Edit this page" link, prev/next nav, sidebar highlight, and canonical URL all work regardless of the app's SvelteKit `trailingSlash` setting (they previously broke on a trailing slash).

## 0.4.0

### Minor Changes

- 6a8346d: Add code-block annotations. On top of Shiki line highlighting, doc code fences now support the full set of comment-driven markers, each styled for light and dark:

  - **Diff** — `// [!code ++]` / `// [!code --]`, with colored backgrounds and `+`/`-` gutter markers (this finishes a feature that was styled but not wired).
  - **Focus** — `// [!code focus]` dims the other lines and sharpens them on hover.
  - **Error / warning** — `// [!code error]` / `// [!code warning]` tint a line red or amber.
  - **Word highlight** — `// [!code word:name]` highlights a token.

  Markers are stripped from the rendered output. No new dependencies (the transformers ship with the `@shikijs/transformers` DocSmith already used). See the new **Code blocks** page in the docs.

### Patch Changes

- 0a69c92: Point the README at the new `create-svelte-docsmith` scaffolder as the fastest way to start a new docs site.

## 0.3.0

### Minor Changes

- 2b84d37: Add an `ErrorPage` component for 404 and error routes. Drop it into a SvelteKit `+error.svelte` to get a styled error screen that keeps the full site chrome — header, search, footer, theme — so a lost reader can navigate away or search instead of hitting a bare stack trace.

  ```svelte
  <script lang="ts">
  	import { docs } from 'svelte-docsmith/content';
  	import { ErrorPage } from 'svelte-docsmith';
  	import { siteConfig } from '$lib/site-config';
  </script>

  <ErrorPage config={siteConfig} content={docs} home="/docs" homeLabel="Back to the docs" />
  ```

  It reads the status and message from the current `page` by default (404 → "Page not found"), and accepts `status`, `title`, `message`, `home`/`homeLabel`, `search`, and a `children` snippet for overrides.

- 2b84d37: Render each doc page's `<h1>` and lead subtitle from frontmatter. The markdown layout now emits the page heading from `title` and a lead paragraph from `description`, so the visible page title, the sidebar label, and the `<title>` tag all come from one source — pages start their body at `##` and never repeat the title.

  Note: if a page previously wrote its own top-level `# Heading`, remove it to avoid two `h1`s (the frontmatter title now provides the page heading).

- 2b84d37: Emit a searchable body-text index. The `docsmith()` Vite plugin now serves a second virtual module, `svelte-docsmith/search`, alongside `svelte-docsmith/content`. It exports one record per page — `{ path, title, section, description, headings, text }` — where `text` is the page's prose and headings reduced to plain text (frontmatter, `<script>` blocks, fenced code, tags, and markdown punctuation removed). It is a separate chunk from the nav index so it can be lazy-loaded only when needed. This is the data layer for upcoming full-text search; the new `SearchDoc` type is exported from the package root.
- 2b84d37: Add a full-text search palette. `DocsShell` now accepts a `search` loader that enables a ⌘K / Ctrl-K command palette:

  ```svelte
  <DocsShell
    {config}
    content={docs}
    search={() => import('svelte-docsmith/search').then((m) => m.docs)}
  >
  ```

  The palette lazily fetches the generated `svelte-docsmith/search` index (a separate chunk, loaded only when search first opens), builds a FlexSearch index over each page's title, headings, description, and body, and links results to their pages with a context snippet. Header (⌘K button) and mobile (search icon) triggers share one dialog and one shortcut. Omit the prop to keep search off.

  The framework-agnostic engine is also exported for custom search UIs: `createSearchEngine(docs)` returning `{ search(query, limit?) }`, plus the `SearchEngine` and `SearchResult` types.

  Adds `flexsearch` as a runtime dependency.

- 2b84d37: Emit SEO head tags from frontmatter. `DocsShell` now renders `<title>`, `<meta name="description">`, canonical, and Open Graph / Twitter Card tags for every page — no per-page wiring. Doc pages get their title and description straight from frontmatter (via the content index); other pages fall back to the site title and the new `config.description`.

  - New optional config fields: `description` (default meta description), `url` (canonical origin — enables `<link rel="canonical">` and absolute `og:url`), and `ogImage` (default share image).
  - New `DocsShell` prop `seo={{ title?, description? }}` to set or override the head on non-doc pages (landing pages, custom routes).

  Previously pages shipped with no `<title>` or meta description at all.

- 2b84d37: Normalize the public component API ahead of v1.0 (breaking).

  - **`Tabs` no longer takes an `items` array.** Each `TabItem` now declares its own `label`, and `Tabs` builds the trigger row from them, so labels are written once instead of duplicated between `items` and each `TabItem`'s `value`. The first tab is selected by default; pass `value` on `Tabs` to start elsewhere.

    ```svelte
    <!-- before -->
    <Tabs items={['npm', 'pnpm']} value="npm">
    	<TabItem value="npm">…</TabItem>
    	<TabItem value="pnpm">…</TabItem>
    </Tabs>

    <!-- after -->
    <Tabs>
    	<TabItem label="npm">…</TabItem>
    	<TabItem label="pnpm">…</TabItem>
    </Tabs>
    ```

  - **`Callout`'s `type` prop is renamed to `variant`**, matching `Badge` and the shadcn convention (`<Callout variant="tip">`). The `CalloutType` type is renamed to `CalloutVariant` and is now exported from the package root.
  - **`Badge` gains an `external` prop**: a linked badge (`href`) can now open in a new tab with `rel="noopener noreferrer"`, matching `Card` and header/footer links.

### Patch Changes

- 2b84d37: Polish anchor navigation and copy resilience.

  - **Mobile table of contents is now server-rendered.** The mobile TOC button and list are driven by the build-time heading index, so they're present on first paint (and without JavaScript) instead of popping in after hydration — matching the desktop TOC.
  - **Heading anchor links are keyboard-accessible.** The `#` link on each `h2`/`h3` now reveals on focus (not just hover) and carries an accessible label, so it's reachable by keyboard and announced by screen readers.
  - **Copying to the clipboard fails quietly.** The copy button no longer throws an unhandled rejection in insecure contexts or when clipboard permission is denied; it logs a warning and leaves the button in its normal state.

- 2b84d37: Refresh the README and clean up stale source comments. The README's exports table now reflects the full public API (`ErrorPage`, `createSearchEngine`, the `svelte-docsmith/search` entry point, the theme presets) and gains short sections for search, SEO, error pages, and themes. Dead references to the old velite pipeline and to an internal `PLAN.md` were removed from the shipped source comments.
- 2b84d37: Fix `PropsTable` overflow on narrow content. The four-column table forced a horizontal scrollbar and crushed the Description column to a sliver whenever a prop had a long type signature (e.g. `() => Promise<SearchDoc[]>`). Each prop now renders as a stacked row — name, required badge, type chips, and default on one wrapping line, with the description full-width below — so nothing overflows and the description stays readable at every width. The `PropsTable` / `Prop` API is unchanged.
- 2b84d37: Fix the `page` layout header on mobile. `DocsShell layout="page"` (landing pages, the themes gallery, any non-doc page) previously rendered the full desktop header at every breakpoint, so on phones the nav links, version badge, and controls crammed together with no menu — and it sat at a different horizontal inset than the docs pages.

  Both layouts now share one header system: `DocsHeader` on desktop and the responsive mobile header below `lg`, so every page's header lines up and collapses to a hamburger identically. The mobile menu now also lists the configured header nav (`config.nav`) alongside the doc sidebar, so links like a top-level "Themes" are reachable from the mobile menu on doc pages too.

- 2b84d37: Fix server-rendered TOC anchors that could miss their heading. The build-time TOC extractor used a hand-rolled slugifier that only approximated `rehype-slug`, so headings with punctuation or symbols drifted — e.g. `## Anchors & copy buttons` rendered the id `anchors--copy-buttons` but the TOC linked `#anchors-copy-buttons`, a dead anchor until hydration re-scanned the DOM. The extractor now slugs with the same `github-slugger` `rehype-slug` uses, including its duplicate-suffixing, so SSR TOC links resolve on first paint for every heading.
- 2b84d37: Fail loudly instead of silently on misconfiguration.

  - **`defineConfig` now validates the footer.** `footer.copyright`, `footer.poweredBy`, and `footer.columns` (each column's `title`/`links`, and every link's `label`/`href`) are checked, so a malformed footer throws a named error instead of rendering blank.
  - **The `docsmith()` Vite plugin warns when it finds no pages.** A missing content directory, or one with no titled `+page.md` files, now logs an actionable warning explaining the empty sidebar instead of leaving you guessing.
  - **Invalid YAML frontmatter reports the file.** A page with broken frontmatter throws an error naming the offending file, rather than a bare parser message.

## 0.2.0

### Minor Changes

- f1c64e5: Add the `darkmatter` theme preset (`svelte-docsmith/themes/darkmatter.css`) — a near-monochrome shell with a warm orange primary and muted teal secondary, in light and dark.

  Add a "Powered by Svelte DocSmith" attribution to the footer. It is shown by default whenever a footer is configured; opt out with `footer.poweredBy: false` in your `DocsmithConfig`.

## 0.1.1

### Patch Changes

- 1329d85: Declare all runtime dependencies. `@lucide/svelte`, `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, and `@fontsource-variable/inter` were devDependencies, so installs outside this monorepo failed to resolve imports from the shipped components and `theme.css`. They are now regular dependencies.

## 0.1.0

### Minor Changes

- 3657661: Initial public release of svelte-docsmith — a framework for building documentation sites with Svelte 5 + SvelteKit.

  - `docsmith()` markdown pipeline (mdsvex + Shiki dual-theme highlighting + heading anchors) and Vite plugin (frontmatter-driven content index + `?source` imports).
  - `DocsShell` layout, `LiveExample`, and docs components: `Tabs`/`TabItem`, `Callout`, `Steps`/`Step`, `Card`/`CardGrid`, `Accordion`/`AccordionItem`, `Badge`, `Kbd`, `FileTree`, `PropsTable`.
  - One-import theme contract (`svelte-docsmith/theme.css`) with a set of tweakcn-based theme presets and light/dark support.
  - `defineConfig()` for typed site configuration.
