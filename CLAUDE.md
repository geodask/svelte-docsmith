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
pnpm size                # size-limit, svelte-docsmith package only
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
pnpm vitest run src/lib/toc/find-elements.spec.ts
pnpm vitest run -t "some test name"
```

Vitest is configured with two workspace projects (`vite.config.ts`):

- `client` — jsdom environment, matches `src/**/*.svelte.{test,spec}.ts`, uses `@testing-library/svelte`
- `server` — node environment, matches other `src/**/*.{test,spec}.ts` files

## Architecture

### `packages/svelte-docsmith` (the library)

Plain, flat `src/lib` structure — no feature-sliced layering here. Everything exported from `src/lib/index.ts` is public API.

- `src/lib/toc/` — table-of-contents engine (DOM scanning, `IntersectionObserver`-based visibility tracking, reactive state via `.svelte.ts` runes files). `toc.svelte.ts` is the main reactive store; `find-elements.ts` and `visibility-observer.svelte.ts` are its collaborators.
- `src/lib/ui/markdown/` — components used to render MDX/markdown output (headings, code blocks with `pre`/`code` wrappers for Shiki syntax highlighting).
- `src/lib/ui/layouts/` — page-level layout components (e.g. `doc-page.svelte`) meant to be composed by consuming apps.
- `src/lib/ui/shadcn/` — vendored shadcn-svelte primitives (button, card, sidebar, sheet, tabs, etc.), added/updated via the shadcn-svelte CLI per `components.json`. Treat these as generated/vendored — prefer editing usage sites over hand-editing primitives unless fixing a real bug.
- Files ending `.svelte.ts` use Svelte 5 runes and hold reactive state/logic; plain `.ts` files are framework-agnostic helpers.
- Build: `svelte-kit sync && svelte-package && publint` produces the `dist/` that's published to npm (see `exports` in `package.json`).

### `sites/docs` (the docs site)

The reference app that dogfoods the published pipeline. `src/lib/` is a flat layout (`components/`, `examples/`, plus `site-config.ts`, `themes-data.ts`, `theme-store.svelte.ts`) — the old FSD scaffolding (`entities/`, `features/`, `widgets/`, …) and the `velite` content pipeline have both been removed.

Content is authored as `+page.md` files under `src/routes/docs/`, preprocessed by `docsmith()` (mdsvex + Shiki + heading anchors) from `svelte-docsmith/preprocess`. The `docsmith()` Vite plugin from `svelte-docsmith/vite` scans page frontmatter into the generated `svelte-docsmith/content` index (which drives the sidebar) and serves `?source` imports for `LiveExample`. `pnpm build` for docs is a plain `vite build`.

## Conventions

- Formatting/linting is centralized: both workspaces call out to the root `.prettierrc` (`prettier --config ../../.prettierrc`). Tabs, single quotes, no trailing commas, 100 print width.
- ESLint config (`eslint.config.js`, flat config) applies `js.configs.recommended`, `typescript-eslint` recommended, and `eslint-plugin-svelte` recommended, with prettier conflict rules disabled.
- Releases are managed with Changesets (`.changeset/`), publishing only `svelte-docsmith`. Add a changeset for any consumer-facing library change; on push to `master`, `release.yml` opens a "Version Packages" PR and, once that PR merges, runs the verify gate then `pnpm ci:publish` (build + `changeset publish`). The docs display the current library version automatically via `import { version } from 'svelte-docsmith/package.json'` in `sites/docs/src/lib/site-config.ts`.
