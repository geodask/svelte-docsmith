# svelte-docsmith

## 0.9.0

### Minor Changes

- bdf9f7a: Publish your releases as a page and a feed. The `docsmith()` plugin now parses a Changesets `CHANGELOG.md` into the generated `svelte-docsmith/changelog` module, and the new `Changelog` component renders it. Because the entries come from the changelog you already ship, the page cannot fall behind what actually went out.

  Commit hashes are stripped, multi-paragraph entries survive intact, and each entry's markdown is rendered to HTML at build time so your site needs no runtime markdown renderer. Release dates come from git, specifically the commit that first introduced each version's heading; no date is invented when the history isn't available. Point the new `changelog` option at the package you publish (`docsmith({ changelog: '../../packages/my-lib/CHANGELOG.md' })`) or set it to `false` to skip.

  `generateFeed` builds an Atom feed from the same index, for a `changelog.xml/+server.ts` alongside the existing sitemap and llms.txt endpoints. Atom rather than RSS because it requires an unambiguous id and timestamp per entry, which a version and its release date give exactly.

  A release that deserves more than a terse entry can have a hand-written page at `src/routes/changelog/<version>/`, which the generated entry then links to instead of to its anchor, so the ones worth writing up get a proper post while the rest stay generated.

- 38e18a1: Add filenames and line numbers to code blocks. A fence's metadata now drives both: ` ```ts title="vite.config.ts" ` puts a filename bar above the block, and `showLineNumbers` adds a gutter. Pair `startLine=12` with numbering when the snippet is lifted out of a longer file so the numbers match the real source.

  Number every block by default with the new `lineNumbers` preprocessor option; an individual fence still opts out with `noLineNumbers`. The numbers are a CSS counter over Shiki's existing per-line spans, so they add no markup and stay out of what the copy button copies. When a block has a title, the copy button moves into the filename bar instead of floating over the first line of code.

- fd1caa0: Add landing page sections, so the marketing page in front of your docs is built from the same design tokens as the docs themselves rather than hand-rolled.

  Five new components: `Hero` (headline, description, call-to-action buttons, and an optional second column for a code sample or screenshot; without one it centres on a single column), `FeatureGrid` and `Feature` (a two or three column grid of icon-and-text cells, with an optional tinted band for alternating against neighbouring sections), `CTA` (the closing panel, with a soft glow behind the heading), and `Action` (the call-to-action link used by `Hero` and `CTA`, in filled and outlined variants).

  Each renders its own full-width `<section>` with the container and spacing already set, so a landing page is a handful of components rather than a wall of layout classes. They use only design tokens, so they follow every theme preset and both colour schemes without configuration.

- 7873879: Add Mermaid diagram support. A ` ```mermaid ` code fence now renders as a diagram instead of highlighted code, themed to match the site — diagrams draw their colors, borders and text from your design tokens and follow the light/dark toggle. Diagrams render in the browser, and `mermaid` is an **optional peer dependency** pulled in only on pages that actually contain one — install it (`npm i -D mermaid`) to use diagrams; sites without them stay lean and need nothing. A `<pre>` source fallback shows if a diagram fails to parse or `mermaid` isn't installed.
- 683746a: Highlight code lines by number from the fence: ` ```svelte {4} `, with lists and ranges (`{1,5}`, `{2-4}`) too. This is the only way to mark a line inside a Svelte template region, where Shiki's comment markers cannot reach: an HTML comment there is stripped without highlighting anything, so the marker silently does nothing. Comment markers keep working everywhere they already did.

  Header nav links now show which one is active. A link is matched on its section rather than its exact path, since a header link is usually the entry point to an area rather than a page you sit on: "Docs" pointing at `/docs/introduction` stays lit across all of `/docs/*`. External links are never marked, and a link to `/` matches only the root. The active link also carries `aria-current="page"`.

- 95682b2: Add Twoslash, so a code sample can show real types on hover. Mark a fence with ` ```ts twoslash ` and the block is compiled by TypeScript, then annotated with the types it actually infers rather than ones written by hand beside the code. Svelte fences work too, via `twoslash-svelte`.

  It is opt-in twice: `docsmith({ twoslash: true })` in the preprocessor, then per fence. `@shikijs/twoslash`, `twoslash-svelte`, and `typescript` are optional peer dependencies, loaded only when a fence asks for them, so sites that don't use Twoslash pay nothing.

  Because the snippet really is compiled, it has to typecheck, and an unresolved import or a type error means there is no type to show. Rather than fail the build over one block, DocSmith falls back to an ordinary highlight and warns which block it was. The usual Twoslash directives apply: `// @errors: 2322` to show an error deliberately, `// @noErrors` to silence one, and `// ---cut---` to keep setup lines out of the rendered output while still compiling them.

  The hover popup is restyled from the stock rich theme onto your design tokens, so it matches the site in both colour schemes.

### Patch Changes

- cde0197: Stop the header showing a stray divider when search isn't wired. The separator between the search trigger and the header action icons rendered unconditionally, so a site that passed no `search` loader to `DocsShell` got a rule with nothing before it. It now appears only alongside the trigger it divides.
- a58f3ea: Stop the code block clipping Twoslash hover popups. A code block is a scroll container, so an absolutely positioned popup was cut off at its edges: hovering a token on the last line showed a sliver of the type and nothing else. CSS alone can't solve it, because an element that scrolls horizontally must also clip vertically. The popup is now promoted to fixed positioning on hover, so it escapes the block, and it flips above the token when there isn't room below. Popups also shrink to the width of the type rather than always filling the maximum. Without JavaScript the popup still opens on hover exactly as before.

  The popup's documentation also reads as documentation now. Sitting inside a `<pre>`, it inherited monospace and whatever token colour the hovered word happened to carry, so the prose looked like more code; it is now sans-serif and muted, with the signature alone staying mono. Each `@param` is its own line with a space after the tag, rather than the whole block running together as `@paramcallbackfn`.

  The `@param` tags also took on the colour of whatever word you hovered, because the dark-theme swap repaints every `span` inside a code block with `--shiki-dark`, which those spans inherited from the hovered token. The popup's documentation now defines that variable itself, so tags read as tags and their text as prose.

## 0.8.0

### Minor Changes

- 4a1b3d4: Add an announcement bar. Set `announcement` in your config (`{ text, tag?, href?, external?, id?, dismissible? }`) to show a thin bar above the header on every page, with an optional leading `tag` pill (e.g. `"New"`) carrying the accent color. It's dismissible by default and, once dismissed, stays dismissed (persisted in `localStorage`) until you change its `id` or `text`, so a new announcement shows again. A blocking head script keeps an already-dismissed bar from flashing in and shifting the layout on reload. The bar sits above the sticky header, so it scrolls away as the reader moves down the page.
- d8d5377: Add nested sidebar sections. A page's `section` frontmatter now accepts an array as well as a string: `section: [Guides, Advanced]` nests the page inside a collapsible **Advanced** subsection under **Guides**. Nesting can go any number of levels deep; `order` still sorts each level, and a subsection takes the smallest `order` of its pages so it slots into reading order. In the sidebar, nested groups are collapsible (a caret on the right of the row), with the branch containing the current page expanded on load and the rest collapsed. Breadcrumbs and the prev/next pager follow the full nested path. Single-string `section` values are unchanged.

  Also makes sidebar ordering deterministic: pages that share an `order` (for example all defaulting to `0`) now tie-break by title instead of by filesystem scan order, so the sidebar is stable across machines.

- aa8ff92: Add synced tab groups. Give related `<Tabs>` a `syncKey` and they share one selection: choosing (say) `pnpm` in any block selects it in every block with the same key, and the choice is remembered across reloads and navigation via `localStorage`. Ideal for package-manager, runtime, or OS variant blocks that a reader picks once. Tabs without a `syncKey` are unchanged, and the server still renders the default tab so there's no hydration flash.

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
