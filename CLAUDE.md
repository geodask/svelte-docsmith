# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read PLAN.md first

**`PLAN.md` at the repo root is the source of truth for all current work** — an audited roadmap with adopted decisions, working conventions for agents, and an implementation tracker. Where this file and PLAN.md disagree, PLAN.md wins.

Critical current-state facts (audited 2026-07-03, see PLAN.md §0 for detail):
- `pnpm typecheck` fails (126 errors in the library) and `pnpm build` fails for `sites/docs` — the repo is mid-way through an interrupted migration. Fixing this is PLAN.md Milestone 1; don't treat these failures as regressions you caused.
- The library's `src/lib/index.ts` is empty — the package exports nothing yet. A green library `build` is NOT evidence the package works.
- Do not push changesets or publish: the release workflow on `master` has no test gate and would publish the broken package.

## What this is

Svelte DocSmith is a framework/library for building documentation sites with Svelte 5 + SvelteKit. Components are based on shadcn-svelte (style: new-york) with themes from tweakcn. This is a pnpm/turbo monorepo with two workspaces:

- `packages/svelte-docsmith` — the publishable library (npm package `svelte-docsmith`). Source of truth for all reusable components/utilities (TOC, markdown renderers, shadcn UI primitives, etc.), exported via `src/lib/index.ts`.
- `sites/docs` — the documentation site that consumes `svelte-docsmith` as a `workspace:*` dependency. This is the dogfooding/reference app and also where MDX content and velite content collections live.

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

Has Feature-Sliced Design (FSD) folder scaffolding under `src/lib/` (`entities/`, `features/`, `widgets/`, `pages/`, `shared/`), but **FSD is being dropped** (PLAN.md §0 conclusion, Milestone 3): the layers are mostly empty scaffolding, and the target layout is a plain `src/lib/components` + `src/lib/content` structure. Do not add new code following the FSD layer rules, and don't invest in preserving them — when touching this area, move toward the flat layout instead.

Current broken wiring to be aware of (until Milestone 1 lands): the widgets import `$shared/ui/*` / `$shared/lib/*` paths that no longer exist — that code was moved into `packages/svelte-docsmith` but the site was never rewired to import from the package. The fix direction is to consume the `svelte-docsmith` package (it's already a `workspace:*` dependency), not to recreate local `shared/` files.

Content: MDX/markdown docs are processed through `velite` (`velite.config.js`) into typed content collections, then rendered via `mdsvex` + the `svelte-docsmith` markdown components. `pnpm build` for docs runs `velite && vite build`.

## Conventions

- Formatting/linting is centralized: both workspaces call out to the root `.prettierrc` (`prettier --config ../../.prettierrc`). Tabs, single quotes, no trailing commas, 100 print width.
- ESLint config (`eslint.config.js`, flat config) applies `js.configs.recommended`, `typescript-eslint` recommended, and `eslint-plugin-svelte` recommended, with prettier conflict rules disabled.
- Releases are managed with Changesets (`.changeset/`), publishing only `svelte-docsmith` (`pnpm ci:publish` builds then runs `changeset publish`). **Do not add changesets for now** — the release workflow on `master` has no test gate, and publishing is frozen until PLAN.md Milestone 4 completes and the owner approves a release.
