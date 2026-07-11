# svelte-docsmith

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
