# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Publishing is **enabled and CI-gated**: `release.yml` runs the full `lint`/`typecheck`/`test`/`build` verify job (reusing `ci.yml`) before `changeset publish`, so a release only goes out if the checks pass. The repo is green at the root and CI enforces that on every PR. First public release is `svelte-docsmith@0.1.0`; the package is pre-1.0, so minor releases may carry breaking changes until v1.0.

## What this is

Svelte DocSmith is a framework/library for building documentation sites with Svelte 5 + SvelteKit. Components are based on shadcn-svelte (style: new-york) with themes from tweakcn. This is a pnpm/turbo monorepo with two workspaces:

- `packages/svelte-docsmith` — the publishable library (npm package `svelte-docsmith`). Source of truth for all reusable components/utilities (TOC, markdown renderers, shadcn UI primitives, etc.), exported via `src/lib/index.ts`.
- `sites/docs` — the documentation site that consumes `svelte-docsmith` as a `workspace:*` dependency. This is the dogfooding/reference app and where the markdown doc pages live.

## Commands

All commands are run from the repo root via turbo and fan out to both workspaces (`svelte-docsmith` and `docs`), unless scoped with `--filter`.

```bash
pnpm dev                 # dev servers for both workspaces
pnpm build               # build both (svelte-package for the lib, vite build for docs)
pnpm test                # vitest run (docs site has no tests; only the lib runs real tests)
pnpm test:coverage       # vitest run --coverage
pnpm typecheck           # svelte-check in both workspaces
pnpm check               # svelte-kit sync && svelte-check
pnpm lint                # prettier --check
pnpm format              # prettier --write
```

Run a command against a single workspace with turbo's filter flag, e.g.:

```bash
pnpm build --filter=svelte-docsmith
turbo run test --filter=svelte-docsmith
```

Or `cd` into the package and use its local scripts directly (e.g. `cd packages/svelte-docsmith && pnpm test`).

### Running a single test

Tests live only in `packages/svelte-docsmith` (vitest). Run a single file or pattern from that package directory:

```bash
cd packages/svelte-docsmith
pnpm vitest run src/lib/toc/from-content.svelte.test.ts
pnpm vitest run -t "some test name"
```

Vitest is configured with two workspace projects (`vite.config.ts`):

- `client` — jsdom environment, matches `src/**/*.svelte.{test,spec}.ts`, uses `@testing-library/svelte`
- `server` — node environment, matches other `src/**/*.{test,spec}.ts` files

## Architecture

### `packages/svelte-docsmith` (the library)

`src/lib` is organized by concern, not flat. The public contract is `src/lib/index.ts` plus the package `exports` subpaths; everything else is internal and free to move. Because no external consumer imports internal paths (they only use `svelte-docsmith`, `/vite`, `/preprocess`, `/content`, `/search`, `/llms`), the layout below can change without a consumer-facing break, as long as `index.ts` and the export map stay stable.

- `src/lib/core/` — the domain layer: framework-agnostic contracts and pure logic, no runtime or build deps. `config.ts` (`DocsmithConfig`, `defineConfig`), `content.ts` (the generated-index record types `DocsContentItem`/`SearchDoc`/`LlmsDoc`), `nav.ts` (`navFromContent`), re-exported through `core/index.ts`.
- `src/lib/buildtime/` — Node-only build tooling. `preprocess.ts` (the `svelte-docsmith/preprocess` mdsvex + Shiki preprocessor), `vite/` (the `svelte-docsmith/vite` plugin, split into `pages.ts`/`frontmatter.ts`/`extract.ts`/`collect.ts`/`git.ts` collaborators behind `vite/index.ts`), `highlight.ts` (shared Shiki config), and `markdown-layout.svelte` (the injected mdsvex default layout). Named `buildtime`, not `build`, because a `build/` dir is gitignored.
- `src/lib/generate/` — framework-agnostic string generators wired into routes: `sitemap.ts` and `llms.ts` (`generateLlmsTxt`/`generateLlmsFullTxt`).
- `src/lib/fallbacks/` — the checked-in stand-ins for the generated virtual modules (`content`/`search`/`llms`) that throw a clear error (shared `missing-plugin.ts`) when the Vite plugin is absent. The export map points `svelte-docsmith/content` and friends here.
- `src/lib/search/` — the client search engine (`create-search.ts`, `context.svelte.ts`, `snippet.ts`).
- `src/lib/toc/` — table-of-contents engine (DOM scanning + `IntersectionObserver` visibility, reactive state via `.svelte.ts` runes files). `toc.svelte.ts` is the main store; `from-content.ts` builds the server-rendered list.
- `src/lib/utils/` — small runtime helpers. `cn.ts` is the shadcn `cn()` plus its bits-ui type helpers (the `utils` alias in `components.json` points here); also `normalize-path.ts`, `clipboard.svelte.ts`, `types.ts`.
- `src/lib/components/` — all Svelte components, split by role. `docs/` (the public authoring components dropped into markdown: `Callout`, `Card`, `Tabs`, `Badge`, `Steps`, `FileTree`, `PropsTable`, and the rest), `chrome/` (shared site-chrome widgets: theme provider/toggle, search UI, background, TOC display), `layouts/` (page composition, including `DocsShell` and `ErrorPage`), `markdown/` (the mdsvex tag-to-component renderer map), `shadcn/` (vendored shadcn-svelte primitives, added/updated via the CLI per `components.json`; treat as generated, prefer editing usage sites), and `icons/`. Public vs internal is decided solely by what `index.ts` re-exports, not by folder.
- Files ending `.svelte.ts` use Svelte 5 runes and hold reactive state/logic; plain `.ts` files are framework-agnostic helpers.
- Build: `svelte-kit sync && svelte-package && publint` produces the `dist/` that's published to npm (see `exports` in `package.json`).

### `sites/docs` (the docs site)

The reference app that dogfoods the published pipeline. `src/lib/` is a flat layout (`components/`, `examples/`, plus `site-config.ts`, `themes-data.ts`, `theme-store.svelte.ts`) — the old FSD scaffolding (`entities/`, `features/`, `widgets/`, …) and the `velite` content pipeline have both been removed.

Content is authored as `+page.md` files under `src/routes/docs/`, preprocessed by `docsmith()` (mdsvex + Shiki + heading anchors) from `svelte-docsmith/preprocess`. The `docsmith()` Vite plugin from `svelte-docsmith/vite` scans page frontmatter into the generated `svelte-docsmith/content` index (which drives the sidebar) and serves `?source` imports for `LiveExample`. `pnpm build` for docs is a plain `vite build`.

## Conventions

- Formatting/linting is centralized: both workspaces call out to the root `.prettierrc` (`prettier --config ../../.prettierrc`). Tabs, single quotes, no trailing commas, 100 print width.
- ESLint config (`eslint.config.js`, flat config) applies `js.configs.recommended`, `typescript-eslint` recommended, and `eslint-plugin-svelte` recommended, with prettier conflict rules disabled.
- Releases are managed with Changesets (`.changeset/`), publishing only `svelte-docsmith`. Add a changeset for any consumer-facing library change; on push to `master`, `release.yml` opens a "Version Packages" PR and, once that PR merges, runs the verify gate then `pnpm ci:publish` (build + `changeset publish`). The docs display the current library version automatically via `import { version } from 'svelte-docsmith/package.json'` in `sites/docs/src/lib/site-config.ts`.
