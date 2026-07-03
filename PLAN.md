# svelte-docsmith — Audit & Roadmap

Prepared 2026-07-03, revised same day after review. This is a planning document, not an implementation log. Nothing in the "Migration plan," "Markdown pipeline rework," "Killer feature," or "Sequencing" sections has been started — everything here is for review before any code changes begin. Decisions marked with a recommendation are defaults you can override.

**Revision notes (v2):** added §2.5 (how styling ships to consumers — a previously missing, adoption-blocking decision), §2.6 (velite's actual job), a concrete target API design in §6 (the "two-file adoption story"), a CI gate and an FSD-flattening step in the roadmap, and several Step 0 additions (peer-dependency audit, undeclared `@lucide/svelte` dependency). The FSD verdict in §0 was reversed on reflection: drop it from `sites/docs`, don't keep it.

## Decision log & implementation status

**Decision status.** The §2 recommendations are **adopted as decisions** unless the owner (George) overrides them in this section. Explicitly confirmed by the owner: §2.4's SvelteKit stance (stable Kit 2 now, Kit-3-ready API design — chosen 2026-07-03). Adopted by default: §2.1 Option A (keep mdsvex, `@shikijs/rehype`), §2.2 Option B (build-time live examples for v1), §2.3 Option A (Tailwind v4 now), §2.5 Option A (documented CSS contract), §2.6 Option A (velite generates nav). An implementing agent should treat all six as settled and proceed; record any owner override here before deviating.

**Implementation tracker.** Update this checklist as work lands (check items only when the milestone's done-criteria in §7 are met, not when work merely starts):

- [ ] Milestone 1 — Stabilize: interrupted migration fixed, dep declarations audited, CI gate added; `typecheck`/`test`/`build` green at root
- [ ] Milestone 2 — Modernize: Svelte/Kit stable bumps, Vite 6→7, Vite 7→8 (separate), Tailwind v4; visual QA passed
- [ ] Milestone 3 — Pipeline: `@shikijs/rehype` swap, velite nav generation, FSD flattened in `sites/docs`
- [ ] Milestone 4 — API + content: README-driven API design implemented, `index.ts` populated per §6.2, 3–5 real doc pages
- [ ] Milestone 5 — Build-time live examples v1
- [ ] Milestone 6 — Packaging (`/preprocess` entry, config schema) + fresh-project adoption test
- [ ] Milestone 7 — Stretch (CLI or playground-v2 exploration)

**Working conventions for implementing agents:**
- Work each milestone on a branch; don't commit directly to `master` (the release workflow publishes from `master` — until the Milestone 1 CI gate exists, a pushed changeset would publish the broken package to npm).
- **Do not add changesets or publish** until Milestone 4 is complete and the owner explicitly approves a release.
- Verify with `pnpm typecheck && pnpm test && pnpm build` at the repo root, plus `pnpm dev` + a real browser check for anything touching rendering. A green `build` alone is not sufficient evidence (see §0 — it passes today on a broken package).
- Environment: pnpm 10.6.4 is pinned via `packageManager`; deps are installed; local Node is v25 (Vite 7+ needs ≥20.19 — fine locally, pin ≥20.19 in CI). `pnpm install` warns that `sharp`'s build script is ignored — harmless, ignore it.
- `pnpm lint` only runs Prettier; ESLint is currently unwired and its parser config is broken (§0) — fixing that is fair game during Milestone 1 but don't trust its current output.

---

## 0. Audit findings (current state, as verified directly against the repo)

This section reports what Phase 1 found. It's blunt on purpose — the honest starting point changes what "roadmap" even means here.

**Headline finding: the repo does not currently work.** Not "needs polish" — `pnpm typecheck`, and `pnpm build` for the docs site, fail outright today, on `master`, with no in-flight changes.

### Dependency inventory

Resolved (not just declared) versions, checked against the npm registry on 2026-07-03:

| Package | Repo has | Latest | Gap |
|---|---|---|---|
| svelte | 5.27.0 | 5.56.4 | behind, same major |
| @sveltejs/kit | 2.20.7 | 2.69.1 | behind, same major (3.0.0-next.6 in early preview) |
| vite | 6.2.6 | 8.1.3 | **2 majors behind** |
| @sveltejs/vite-plugin-svelte | 5.0.3 | 7.1.2 | **2 majors behind** |
| @sveltejs/adapter-auto | 4.0.0 | 7.0.1 | **3 majors behind** |
| @sveltejs/adapter-vercel | 5.7.0 | 6.3.4 | 1 major behind |
| @sveltejs/package | 2.3.11 | 2.5.8 | behind, same major |
| svelte-check | 4.1.6 | 4.7.1 | behind, same major |
| vitest | ^3.0.0 | 4.1.9 | 1 major behind |
| tailwindcss | 3.4.17 | 4.3.2 | **1 major behind** (v3 EOL Feb 2027) |
| mdsvex | 0.12.5 | 0.12.7 | nearly current |
| velite | 0.2.2 | 0.4.0 | pre-1.0, 2 minor versions behind — breaking changes likely between |
| shiki | 3.2.2 | 4.3.0 | 1 major behind |
| bits-ui | 1.3.19 | 2.18.1 | **1 major behind** — this underlies every shadcn-svelte primitive in the repo |
| tailwind-variants | 1.0.0 | 3.2.2 | 2 majors behind |
| tailwindcss-animate | 1.0.7 | — | **deprecated upstream by shadcn**, replaced by `tw-animate-css` |
| eslint | 9.18 | 10.6.0 | 1 major behind |

The single prior commit predates today by well over a year (2025-05-12). Nothing here is a surprise once you know the repo has been dormant — but it means "upgrade the deps" is not a minor chore, it's a real project phase (see §2).

### Markdown pipeline (traced end-to-end)

`sites/docs/svelte.config.js` wires `mdsvex` with a custom `highlight` function:

```js
highlight: {
  highlighter: async (code, lang) => {
    const html = escapeSvelte(
      highlighter.codeToHtml(code, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
        transformers: [transformerNotationHighlight()]
      })
    );
    // Remove pre tags from the html string
    const formattedHtml = html.replace(/^<pre.*?>/, '').replace(/<\/pre>$/, '');
    return `<Components.pre>{@html \`${formattedHtml.trim()}\`}</Components.pre>`;
  }
}
```

Two concrete problems, confirmed by research (§Decisions, markdown pipeline):

1. **The regex strip is fragile by construction.** It assumes Shiki's `codeToHtml` output is always a single-line `<pre ...>...</pre>` with no trailing newline. No `s`/`m` flags. A Shiki version bump that changes whitespace or wraps output differently silently breaks code-block rendering with no compile error.
2. **The highlighter is created once at config-load time with a hardcoded language list**: `['javascript', 'typescript', 'svelte', 'bash']`. Any fenced code block in any other language (json, css, html, python, yaml — anything) throws at build time.

The `escapeSvelte()` call and the `<Components.pre>` template convention are *not* hacks — they're mdsvex's own documented mechanism for custom highlighters and layout-component overrides, used correctly here.

Root cause (per research): the project uses mdsvex's `highlight` option, a string-in/string-out hook, instead of putting Shiki into the `rehypePlugins` array (where `rehypeSlug` and `rehypeSectionize` already run) via `@shikijs/rehype`, which operates on the HAST tree and replaces `pre`/`code` nodes directly — no string ever gets built and re-parsed, so there's nothing to regex-strip, and its default export ships the full bundled language set instead of a hardcoded four. See §4 for the concrete fix.

Separately: `velite.config.js` defines a `docs` collection (`docs/**/*.md`) with `s.toc({ minDepth: 2 })` for heading extraction, while the **library's own runtime `toc/` module** (DOM-scanning + `IntersectionObserver`) is what `TableOfContents.svelte` actually consumes. Two parallel TOC mechanisms are wired up; only one is used. And: **there are currently zero markdown content files in the repo.** `sites/docs/src/routes/` contains exactly one file, `+page.svelte`. The entire pipeline above is unexercised against real content.

### Public API surface (`packages/svelte-docsmith/src/lib/index.ts`)

This is the most important finding in the whole audit: **the file is empty. Zero bytes.** The package's declared entry point (`"svelte": "./dist/index.js"`, `"types": "./dist/index.d.ts"`) exports nothing. `src/lib/ui/index.ts` is `export {};` — also nothing. Real, populated sub-barrels exist (`toc/index.ts`, `markdown/index.ts` both correctly re-export their modules) but nothing surfaces them to a consumer.

Worse: what *does* exist internally doesn't compile. `pnpm typecheck` on the library reports **126 errors across 90 files**. Concretely:
- `doc-page.svelte`, `tabs.svelte`, `tab-item.svelte` (under `src/lib/ui/`) import from `$shared/ui/shadcn/*`, `$shared/lib/shadcn`, `$shared/lib/breadcrumb.svelte` — a path alias that isn't configured anywhere in the library's own `svelte.config.js`. These files were evidently copy-pasted from `sites/docs` during an extraction into the library and never had their imports rewritten to the library's own flat, alias-free layout.
- A `WithChildren<T>` generic type is used throughout (`markdown/types.ts`, `tabs.svelte`) but only declared as a global ambient type in `sites/docs/src/app.d.ts` — **not** in the library's own `app.d.ts`. Even fixed, an ambient global in an app's `app.d.ts` doesn't ship inside a published package's `dist/*.d.ts`, so this needs to become a real exported type, not stay a global.
- `src/lib/tabs.svelte` and `src/lib/ui/tabs.svelte` are byte-identical duplicates (confirmed via `diff`), as are `tab-item.svelte` and its `ui/` counterpart — leftover from the same incomplete migration.

A subtlety worth flagging: `pnpm build` for the library actually **succeeds** (`vite build && svelte-package && publint` all report success). This is misleading, not reassuring — because `index.ts` is empty, none of the broken `ui/*` subtree is reachable from the demo app's build graph, so the build never exercises the broken imports, and `svelte-package`'s file-by-file transform is more lenient than `svelte-check`'s full type resolution. **A green build here is not evidence the package works.**

### Test / lint health

- `pnpm test`: passes, but there's almost nothing to fail — the library has one trivial `1 + 2 === 3` demo test; the docs site's `test`, `test:unit`, and `test:coverage` scripts are literally `echo 'No tests configured'`.
- `pnpm lint`: only runs `prettier --check` in both packages — **ESLint (`eslint.config.js`) is configured but never invoked by any script.** Running it directly (`npx eslint .`) produces 100 reported problems, but the overwhelming majority are `Parsing error: Unexpected token {` — a broken parser configuration (TS/svelte-eslint-parser mismatch), not real per-file issues. Net effect: no linting is actually happening today, and the tool would need a config fix before it could be trusted even if wired in.
- No CI workflow validates typecheck/test/lint on PRs. The only workflow, `.github/workflows/release.yml`, runs on every push to `master` and would execute `pnpm ci:publish` (build + `changeset publish`) with **no test or typecheck gate**. If a changeset were added right now, this would publish the currently-empty, non-functional package to npm as a new version.
- `pnpm size` (size-limit) has no `.size-limit.json` / config anywhere — would error if actually run.

### FSD compliance in `sites/docs`

Can't really be assessed as "compliant vs. violating," because there's almost no code to check:
- `entities/`, `features/`, `pages/` are 100% empty — README scaffolding only.
- `shared/api`, `shared/config`, `shared/model` are stub files (`export {};`).
- `shared/ui`, `shared/lib`, and the layout components referenced by every widget **do not exist** in `sites/docs` at all. They were migrated into `packages/svelte-docsmith`'s flat lib structure (matching the empty-index/broken-imports findings above), but `sites/docs`'s widgets (`header`, `menu-sidebar`, `table-of-contents`, `early-release-alert`) were never updated — they still import the old, now-nonexistent `$shared/*` paths. This is what makes `pnpm typecheck` and `pnpm build` fail for the docs site.
- **Zero files in `sites/docs` actually import from the `svelte-docsmith` package**, despite it being declared as a `workspace:*` dependency specifically to dogfood the library. (One string match on `header.svelte` turned out to be a GitHub URL, not an import.)
- `menu-sidebar/model/index.ts` contains hardcoded nav data for a *different* project — "Column Definition," "Column Visibility," "reactivePagination," "reactiveSorting" — this reads like leftover placeholder data from a reactive-table library, not svelte-docsmith content.

**Conclusion**: this isn't really an FSD-violation problem, it's an interrupted-migration problem. Someone was in the middle of extracting shared UI out of `sites/docs` and into `packages/svelte-docsmith` as a real library, and the docs site was never wired back up to consume it.

On the FSD skeleton itself: **drop it from `sites/docs`.** For a solo docs site whose `entities/`, `features/`, and `pages/` layers are all empty scaffolding, FSD is ceremony that misleads a reader into seeing architecture where there's only folder structure — and it imposes public-API/layer-direction bookkeeping that costs real time at a few-hours-a-week pace. A plain `src/lib/components` + `src/lib/content` layout is more honest, cheaper to maintain, and easier for a recruiter skimming the repo to follow. FSD earns its keep on large multi-team apps; this isn't one. (This reverses the initial audit's "sound and worth keeping" verdict — the deciding argument is maintenance cost vs. what the structure actually buys here, which is currently nothing.)

### One more latent bug worth naming

`packages/svelte-docsmith/src/lib/ui/markdown/pre.svelte` imports `@lucide/svelte` (`Check`, `Copy` icons), but `@lucide/svelte` is **not declared anywhere in the library's `package.json`** — it only exists as a devDependency of `sites/docs`. The moment a stranger installs the published package and renders a code block, this import fails. Same class of problem as the empty `index.ts`: invisible today only because nothing consumes the package. Fixed in §3 Step 0.

---

## 1. Executive summary

svelte-docsmith should become the documentation framework for Svelte 5 library authors who want their interactive examples to live inside a real, stateful SvelteKit app — not sandboxed as isolated islands, the way Astro Starlight (the dominant player) structurally requires. The one-sentence pitch: **"svelte-docsmith is the docs framework for Svelte projects whose examples need to be part of one running app, not bolted-on islands."** That's a real, currently unclaimed niche — the one prior Svelte-native attempt (kit-docs) has been dead since 2023, and Starlight's own maintainers confirm it has no native live-editable-code-block primitive. The niche is narrow (Svelte-specific docs tooling is a small market), so success depends more on execution quality for that specific audience than on out-featuring Starlight broadly. Before any of that matters, though, the repo needs to go from "doesn't build" to "actually works" — that's not optional scope, it's the prerequisite for everything else in this document.

---

## 2. Decisions to make

These are yours to approve or override. Each has a recommendation, not a mandate.

### 2.1 Markdown pipeline: keep mdsvex, or replace it?

- **Option A — Keep mdsvex, fix the highlighter.** Move Shiki from mdsvex's `highlight` string-hook into `rehypePlugins` via `@shikijs/rehype`, which operates on the HAST tree (no string round-trip, no regex-strip) and ships the full bundled language set by default (no hardcoded 4-language list). This is additive — same extension point already used for `rehypeSlug`/`rehypeSectionize`.
- **Option B — Drop mdsvex, build a raw remark/rehype pipeline directly on velite's documented hooks.** velite officially supports `markdown.remarkPlugins`/`rehypePlugins` and even documents this exact Shiki pattern. More control, but mdsvex's unique value — compiling markdown *into real Svelte components*, which is what lets `docs/**/*.md` files literally be SvelteKit routes — has no equivalent in velite. Dropping mdsvex means rebuilding component-embedding-in-markdown from scratch.
- **Option C — Adopt a newer tool.** Researched and ruled out: no mdsvex successor or Svelte-native MDX alternative has emerged. mdsvex remains the only tool that compiles markdown-with-embedded-components into Svelte source.

**Recommendation: Option A.** mdsvex is "alive but slow" (0.12.7 as of ~March 2026, a 163-issue/10-PR backlog, but its Svelte-5-compat issue is closed and no compatibility blockers were found) — not healthy enough to bet everything on forever, but not a reason to do a rebuild today when the actual reported pain (regex hack, hardcoded languages) has a same-stage, low-risk fix available. Flag mdsvex's maintenance pace as a watch item to revisit in 6–12 months, not a blocker now.

### 2.2 Live playground: build it now, or defer?

- **Option A — Full in-browser editable playground now.** Matches the official svelte.dev REPL: compiler runs in a Web Worker, npm imports resolved via jsDelivr metadata + real npm tarballs unpacked client-side, rendered output sandboxed in a `srcdoc` iframe with `postMessage` bridging. This is genuinely how the official tool works — it is not a weekend build. No maintained, Svelte-5-ready package exists to shortcut this (the official `@sveltejs/repl` npm package hasn't published since August 2023 and targets Svelte 3/4).
- **Option B — Build-time, live-but-read-only examples.** Compile `.svelte` examples at doc-build time (via a remark/Vite plugin, the same pattern as the existing `mdsvexamples` package), render the real component on the page, pair with a read-only syntax-highlighted source panel. No in-browser recompilation, no sandboxing, no npm-resolution problem.

**Recommendation: Option B for v1, explicitly deferring editability.** Full in-browser editing is realistically a multi-month effort at a few-hours-a-week pace, even for a stripped single-file-only version — the worker/iframe/postMessage error-handling loop alone tends to eat far more time than it looks like from outside. Option B is days-to-two-weeks, has real precedent, and is still a genuine differentiator (live, real, interactive components — not static screenshots). Treat full editability as a v2/v3 stretch goal, gated on v1 actually shipping and getting used. See §5 for the scoped spec.

### 2.3 Tailwind: upgrade to v4 now, or defer?

- **Option A — Upgrade now**, as part of the broader dependency refresh. shadcn-svelte's registry already defaults new projects to Tailwind v4 (CSS-first `@theme` config, OKLCH color variables, `tw-animate-css` instead of `tailwindcss-animate`); every additional month on v3 makes future `shadcn-svelte add` pulls diverge further from the vendored components already in the repo.
- **Option B — Defer** until v3's Feb 2027 EOL forces the issue.

**Recommendation: Option A, sequenced carefully.** This is *not* a purely mechanical bump — realistically 2–4 focused days: run `npx @tailwindcss/upgrade` on a branch, swap `tailwindcss-animate` → `tw-animate-css`, port `tailwind.config.ts` into `@theme`/`@theme inline`, convert HSL CSS variables to OKLCH (regenerate via tweakcn, which supports both formats), sweep renamed utility classes (`shadow-sm`→`shadow-xs`, `ring`→`ring-3`, etc.), and do a full visual QA pass against the vendored shadcn-svelte "new-york" component set. Do this as part of the stabilization phase (§3), not bundled into feature work.

### 2.4 How far to chase the Svelte/Kit/Vite version bump?

Not explicitly asked for a menu, but it's a real fork in the road given what research found: Vite 8 is a from-scratch bundler rewrite (Rolldown/Oxc replacing Rollup/esbuild), and `@sveltejs/vite-plugin-svelte`'s latest major (7.x) *requires* Vite 8 — there's no version that bridges Vite 6 straight to 8.

**Recommendation:** bump Svelte, SvelteKit, `svelte-check`, `@sveltejs/package`, and `vitest` to current stable now (low risk, no breaking changes found in that range beyond an experimental remote-functions feature this repo doesn't use). Bump Vite 6→7 + `vite-plugin-svelte` 5→6 + adapters together next (Vite's own team calls this hop "smooth," mainly a Node-version floor raise). Treat Vite 7→8 as an **isolated, separately-tested step** — budget real time for it, don't bundle it into the same PR as everything else.

**On SvelteKit 3 (decided: stable now, Kit-3-ready design).** Kit `3.0.0-next.6` is in active preview, and its two headline changes are directly relevant here: `svelte.config.js` gets folded into `vite.config.js`, and `$env/*` modules are replaced by explicit environment variables. The temptation to build against it now is real — the adoption story (§6.1) centers on `svelte.config.js`, which Kit 3 abolishes. But the adoption math decides it: if the published library requires a pre-release Kit, only preview users can adopt it, and every `next.*` release can break the package while it's trying to stabilize. So: **target latest stable Kit 2 for both packages now, and design the public API so the Kit 3 move is a docs change, not an API change.** Concretely (folded into §6.1's design principles): `docsmith()` is a self-contained preprocessor factory with no knowledge of *where* it's registered — it works identically in today's `svelte.config.js` `preprocess` array and in Kit 3's consolidated `vite.config.js`; nothing in the library imports `$env/*` or other Kit-config-coupled modules (the `esm-env` rule from §3 Step 2, generalized). Adopt Kit 3 the moment it ships stable — track it as a named watch item alongside mdsvex (§2.1), and revisit if a dated stable release lands mid-roadmap. Svelte 6 stays fully deferred (open milestone, no due date, no preview releases).

### 2.5 How does styling ship to consumers? (previously missing — this is an adoption blocker, not a detail)

Every component in the library is styled with Tailwind utility classes and depends on shadcn's CSS custom properties (`--muted`, `--primary`, `--background`, …) existing in the consumer's stylesheet. Two consequences the original plan missed entirely:

1. **A consumer's Tailwind build does not scan `node_modules` by default.** Install the package, render `<DocPage>`, and every `bg-muted`/`prose`/`not-prose` class silently produces zero CSS. Nothing errors — the page just renders unstyled.
2. **The shadcn CSS variables don't exist in a fresh consumer app** unless they've independently set up shadcn-svelte with the same theme contract.

Options:

- **Option A — Document the consumer contract:** consumer adds `@source "../node_modules/svelte-docsmith"` (Tailwind v4 syntax) to their CSS and imports a provided theme stylesheet (`svelte-docsmith/theme.css`) that defines the CSS variables. Cheap to build, standard practice for Tailwind-styled Svelte libraries, but two manual steps a stranger can get wrong.
- **Option B — Ship precompiled CSS:** build the library's styles to a static `styles.css` at package time; consumer imports one file and needs no Tailwind config awareness (and doesn't even need Tailwind). More build machinery, risks class duplication/conflicts if the consumer *also* uses Tailwind (very likely for this audience), and loses theme-token customization via utilities.
- **Option C — No utility classes in shipped components:** style library components with plain scoped CSS driven entirely by the CSS variables. Most portable, but means rewriting every vendored component's styling and abandoning the shadcn styling idiom internally.

**Recommendation: Option A**, wrapped by the scaffolding/config story so the two manual steps become zero steps for anyone using the init path (§6): the `docsmith` preprocessor/CLI writes the `@source` line and theme import for you. This keeps the internal shadcn idiom, matches what the target audience (Tailwind-using Svelte devs) already expects, and is verifiable early — Milestone 4's "adopt it in a stranger's project" test (§7) exists to catch exactly this. Whichever option you pick, it constrains both the Tailwind v4 migration (§3 Step 5) and the API design (§6), so decide it before Milestone 2 completes.

### 2.6 What is velite actually for? (give it a job or cut it)

Today velite defines one collection with an unused `s.toc()` field and a path transform — it's wired but jobless (§0). Keeping a whole content-layer dependency to do nothing is worse than either alternative:

- **Option A — Give velite its real job: generate the sidebar nav (and later, a search index) from content frontmatter.** This simultaneously kills the hardcoded, wrong-project nav data in `menu-sidebar/model/index.ts` and delivers table-stakes behavior — Starlight autogenerates sidebars from the filesystem; a docs framework where you hand-maintain a nav array in TypeScript isn't credible. Velite's schema validation (title/description/order/section frontmatter) is exactly the right tool.
- **Option B — Cut velite**, hand-roll nav generation with `import.meta.glob` over the markdown routes.  Fewer deps, but you end up rebuilding frontmatter parsing/validation poorly, and you lose the obvious path to a build-time search index later.

**Recommendation: Option A.** "Nav derived from content, never hand-written" should be an explicit design principle of the framework (§6). This also resolves the dual-TOC question from §4 coherently: velite owns *build-time* structure (nav, search), the library's runtime `toc/` module owns *in-page* scroll tracking — two mechanisms, but now each with a distinct, justified job.

---

## 3. Migration plan (Svelte / SvelteKit / Vite / Tailwind)

This phase is about un-breaking and modernizing the foundation, in an order that minimizes the chance of stacking failures on top of each other. Nothing here is feature work.

**Step 0 — Fix the interrupted migration first, before touching any dependency version.** This is not really a "migration" step, it's a prerequisite: the repo doesn't build today for reasons that have nothing to do with stale dependencies (empty `index.ts`, `$shared/*` imports pointing nowhere, missing `WithChildren` type, docs site not consuming the library). Bumping dependency versions on top of a repo that doesn't compile just adds noise to the diagnosis. Fix this first, on current dependency versions, so you have a known-good baseline to upgrade from. Concretely:
- Populate `packages/svelte-docsmith/src/lib/index.ts` with real exports (see §6 for what).
- Fix every `$shared/*` import inside the library to point at the library's own flat file locations.
- Move `WithChildren`/`WithChildrenOptional` out of ambient globals into a real exported type from the library.
- Delete the duplicate `tabs.svelte`/`tab-item.svelte` files, keep one location.
- Rewire `sites/docs`'s widgets to import shadcn primitives, layouts, and the `toc` module from the `svelte-docsmith` package instead of the nonexistent local `$shared/*` paths.
- **Audit the library's dependency declarations against what its source actually imports.** Known offenders: `@lucide/svelte` is imported by `pre.svelte` but declared nowhere in the library's `package.json` (runtime failure for any consumer); `tailwindcss: ^3.4.17` as a peerDependency will be wrong the moment the Tailwind v4 migration lands (Step 5) and needs widening or rethinking per the §2.5 decision; check whether `bits-ui` and `mode-watcher` belong as regular dependencies (they're compiled into shipped components, so yes) and whether anything currently in `dependencies` is actually unused.
- **Add a CI workflow** (`.github/workflows/ci.yml`) running `typecheck`, `test`, `lint`, and `build` on pull requests, and gate the existing `release.yml` publish job on it — right now a push to `master` with a changeset would publish the broken package to npm with no checks at all. An hour of work, and it's the first thing anyone evaluating the repo looks for.
- Verify with `pnpm typecheck && pnpm build` at the root — both packages, zero errors, before moving on.

**Step 1 — Low-risk version bumps (do together, one PR):**
```
pnpm add -D svelte@latest @sveltejs/kit@latest svelte-check@latest vitest@latest -w
pnpm --filter svelte-docsmith add -D @sveltejs/package@latest
```
Run `npx sv migrate svelte-5` and `npx sv migrate sveltekit-2` — but per community-reported experience, review each file's diff rather than trusting a whole-repo one-shot run (the `$:` → `$derived`/`$effect` disambiguation is known to get it wrong sometimes). Note for the vitest 3→4 bump: the library's `vite.config.ts` uses the `test.workspace` key, which vitest deprecated in favor of `test.projects` — expect to rename that block as part of this step. Manually verify after: `pnpm typecheck`, `pnpm test`, `pnpm build`, and manually click through the demo app in a browser.

**Step 2 — Fix the `$app/environment` usage in the library.** Independent of any version bump — SvelteKit's own packaging docs warn against using `$app/environment` in code meant to be consumed outside a SvelteKit app, because `svelte-package` ships the reference uncompiled. Replace with `esm-env`'s `BROWSER` export. Verify: `pnpm build --filter=svelte-docsmith` no longer emits the "Avoid usage of `$app/environment`" warning from `@sveltejs/package`.

**Step 3 — Vite 6→7 + `@sveltejs/vite-plugin-svelte` 5→6 + adapters, together (version-locked, must move as a set):**
```
pnpm add -D vite@^7 @sveltejs/vite-plugin-svelte@^6 -w
pnpm --filter docs add -D @sveltejs/adapter-vercel@^6 @sveltejs/adapter-auto@^7
```
Before this step: confirm local and CI Node versions are ≥20.19 (Vite 7 drops Node 18). Manually verify after: dev server starts cleanly, `pnpm build` for both packages, and exercise the deployed-adapter path if you have a Vercel preview available.

**Step 4 — Vite 7→8 + `vite-plugin-svelte` 6→7, isolated (highest-risk step — its own PR, its own testing pass):**
```
pnpm add -D vite@^8 @sveltejs/vite-plugin-svelte@^7 -w
```
This is a bundler swap (Rollup/esbuild → Rolldown/Oxc), not a routine bump. Manually verify: any custom Vite config in `sites/docs/vite.config.ts` or the library's `vite.config.ts` (plugin hooks, `rollupOptions` → check if renamed to `rolldownOptions`), CJS-dependency interop (shiki, velite, mdsvex all touch Node APIs — watch for import-interop breakage), and a full rebuild + smoke test of both packages.

**Step 5 — Tailwind v3→v4**, done after the Vite/Kit bumps are stable (so you're not debugging two unrelated toolchains at once):
1. Branch, run `npx @tailwindcss/upgrade`, review the diff — don't trust it blindly (real-world reports include silently-missed content globs in monorepos).
2. Swap `tailwindcss-animate` → `tw-animate-css`.
3. Regenerate the theme via tweakcn in v4/OKLCH mode; migrate existing HSL CSS variables.
4. Port any remaining custom values from `tailwind.config.ts` into `@theme`/`@theme inline` blocks in `app.css`.
5. Switch from the PostCSS plugin to `@tailwindcss/vite` (SvelteKit-preferred per Tailwind's own guidance).
6. Sweep renamed utilities across the vendored `ui/shadcn/*` components (`shadow-sm`→`shadow-xs`, `ring`→`ring-3`, `blur-sm`→`blur-xs`, etc.).
7. Full visual QA pass — every shadcn-svelte component, light and dark mode, against the current "new-york" baseline, since this touches every rendered pixel in the demo/docs app.

**Defer, don't plan around yet:** SvelteKit 3 (early preview, `3.0.0-next.6`, no due date — see §2.4 for the decided stance: stable Kit 2 now, API designed to make the Kit 3 move a docs-only change) and Svelte 6 (open milestone, 16 open issues, no due date). Revisit once either has a stable or dated-prerelease release.

---

## 4. Markdown pipeline rework plan

Concrete, scoped to the decision in §2.1 (keep mdsvex, fix the highlighter extension point).

1. Add `@shikijs/rehype` as a dependency of `sites/docs`.
2. In `sites/docs/svelte.config.js`, remove the custom `highlight` function and the top-level `createHighlighter()` call entirely.
3. Add Shiki to the existing `rehypePlugins` array, alongside `rehypeSlug` and `rehypeSectionize`:
   ```js
   rehypePlugins: [
     rehypeSlug,
     [rehypeSectionize, { idPropertyName: 'data-section-id' }],
     [rehypeShiki, {
       themes: { light: 'github-light', dark: 'github-dark' },
       transformers: [transformerNotationHighlight()]
     }]
   ]
   ```
   (exact option names to confirm against `@shikijs/rehype`'s current API when implementing — the shape above is the documented pattern, not copy-paste-verified against this repo).
4. This removes the hardcoded 4-language allowlist for free (the package's default highlighter loads the full bundled language set) and removes the regex-strip entirely (HAST node replacement, no string round-trip).
5. Re-verify the `<Components.pre>`/custom `pre.svelte` wiring still applies cleanly — since `@shikijs/rehype` produces its own `<pre>`/`<code>` HAST nodes directly rather than going through mdsvex's `Components.pre` override convention, check whether the copy-button/scroll-area wrapper in `packages/svelte-docsmith/src/lib/ui/markdown/pre.svelte` needs to be applied via a different mechanism (e.g. a Shiki transformer that wraps output, or restoring the mdsvex layout-component override if it's still compatible). This is the one part of the swap that needs hands-on verification, not just a config change.
6. Resolve the dual-TOC redundancy per the §2.6 decision: velite owns build-time structure (sidebar nav from frontmatter, later a search index), the library's runtime `toc/` module owns in-page scroll tracking. Concretely: drop the unused `s.toc()` field, add frontmatter schema fields (`title`, `description`, `order`, `section`) to the velite collection, and generate the sidebar nav from it — deleting the hardcoded wrong-project nav data in `menu-sidebar/model/index.ts` in the same change.
7. **What breaks in existing content:** nothing, because there is no existing content — this is the ideal time to make this change, before any real docs pages exist to migrate. Author the first few real doc pages (see §7) directly against the new pipeline rather than the old one.

---

## 5. Killer feature spec: build-time live examples (v1)

Scoped per the §2.2 recommendation — explicitly not the full editable REPL yet.

**v1 goal:** a `<Example>`-style block usable in markdown docs that renders a real, interactive Svelte component on the page (not a screenshot, not a static code block) plus a read-only syntax-highlighted source panel, compiled at doc-build time.

**Milestone 1 — spike (a few hours).** Prove the mechanism works at all: a hardcoded `.svelte` file, a Vite/remark plugin that imports it and renders it inline in one doc page, alongside its raw source rendered through the already-fixed Shiki pipeline (§4). No polish, no reusable API yet — just confirm build-time component-in-markdown rendering works in this specific mdsvex + velite setup.

**Milestone 2 — real plugin, scoped API (a few sessions).** Formalize it: a directory convention (e.g. `examples/<name>.svelte`) or a fenced-code-block convention (` ```svelte example ` in the markdown source, following the same meta-string pattern Shiki transformers already parse) that the mdsvex/remark pipeline picks up automatically, compiles, and renders as `<LiveExample source={...}><rendered component /></LiveExample>` — component and source panel side by side, using the existing `pre.svelte`/copy-button chrome for the source side. Look at `mdsvexamples` (github.com/mattjennings/mdsvexamples) as a reference implementation of this exact pattern before building from scratch — it may be directly reusable or at least save significant design time.

**Milestone 3 — polish (ongoing, as real docs get written).** Multiple named examples per page, a toggle to show/hide source, error display if an example fails to compile (should fail the doc build loudly, not silently render nothing), and light theming so the example's rendered output doesn't visually clash with arbitrary component styling.

**Explicitly out of scope for v1 (v2/v3 candidate):** in-browser editing and recompilation. If and when that's tackled, plan to fork/vendor the current Svelte-5-targeting source from `sveltejs/svelte.dev/packages/repl` rather than build the compiler-worker/npm-resolver/sandboxed-iframe stack from scratch — replicating that cleanly (worker-based compilation, real npm tarball resolution via jsDelivr, sandboxed `srcdoc` iframe with `postMessage` bridging) is a multi-month undertaking on its own, and no maintained drop-in package exists to shortcut it (the official `@sveltejs/repl` npm package hasn't been published since 2023 and only targets Svelte 3/4).

---

## 6. API/DX design

This matters as much as any single feature — a stranger's first five minutes with the library is currently: install it, `import` anything from it, get nothing. The original version of this section was a punch-list of fixes; that was the wrong altitude. What makes a library well-defined isn't a populated `index.ts` — it's a **committed adoption story that the exports are then derived from**. So: design first, then populate.

### 6.1 The target adoption story ("two files and your markdown works")

This is the product. Everything else in this section serves it. A stranger adopting svelte-docsmith should touch exactly this much:

```js
// svelte.config.js — the entire markdown pipeline, one call
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith } from 'svelte-docsmith/preprocess';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), docsmith({ /* optional: shiki themes, extra rehype plugins */ })],
	kit: { adapter: adapter() }
};
```

```svelte
<!-- src/routes/docs/+layout.svelte — the whole shell, one component -->
<script>
	import { DocsShell } from 'svelte-docsmith';
	import { config } from '../../docsmith.config';
	const { children } = $props();
</script>

<DocsShell {config}>{@render children()}</DocsShell>
```

Plus one CSS contract per the §2.5 decision (`@source` line + theme import — automated away by the init path when it exists). After that, dropping `whatever.md` under `src/routes/docs/` produces a styled page with code highlighting, heading anchors, breadcrumbs, sidebar nav, and a live TOC. That sentence is the README's first paragraph and the measuring stick for every API decision below.

**Design principles that fall out of this:**
- **Nav is derived from content, never hand-written** (§2.6). Frontmatter (`title`, `order`, `section`) drives the sidebar; there is no nav array to maintain.
- **Config is data, not code**: one `docsmith.config.ts` exporting a typed object (site title, repo URL, logo, theme tokens) — validated with a `defineConfig()` helper so mistakes fail at build time with a real message.
- **Escape hatches at every layer, defaults at none required**: override a single markdown component (custom `pre`), or a whole region (custom sidebar), or ignore `DocsShell` entirely and compose from parts — without forking the package.
- **Kit-3-proof by construction** (§2.4 decision): `docsmith()` is a self-contained preprocessor factory that doesn't care where it's registered — the same call works in today's `svelte.config.js` and in SvelteKit 3's consolidated `vite.config.js` when that ships stable, making the Kit 3 migration a README update rather than an API break. Corollary: no library code touches `$env/*` or any Kit-config-coupled module (Kit 3 removes `$env/*`; the library already needs the `esm-env` fix for `$app/environment` per §3 Step 2 — this generalizes that rule).

### 6.2 Export layers (what `index.ts` actually contains, and why)

1. **`svelte-docsmith/preprocess`** — a separate export-map entry (it runs in `svelte.config.js`, i.e. Node at config time, and must not drag component code into that context). Returns the pre-built `mdsvex()` preprocessor with the fixed Shiki wiring (§4), slug/sectionize plugins, and the layout mapping. This is not a "consider" item as originally written — it *is* the framework; without it the value-add is 40 lines of config a stranger must hand-copy correctly.
2. **Main entry, tier 1 — assembled experience:** `DocsShell` (header + sidebar + content + TOC composition), `DocPage` (the markdown layout), `TableOfContents`, `Tabs`/`TabItem`, `defineConfig` + the `DocsmithConfig` type. Note `TableOfContents` currently lives in `sites/docs` as a widget — it moves *into* the library; the docs site keeping its own TOC widget while the library exports a TOC engine is dogfooding backwards.
3. **Main entry, tier 2 — parts for customizers:** the runtime TOC engine (`createToc` etc. from `toc/`), `useClipboard`, the breadcrumb utility, and the markdown component map (`pre`, `code`, `h2`, `h3`) for consumers overriding individual renderers via the preprocessor options.
4. **Not exported: the vendored shadcn primitives (`ui/shadcn/*`).** Decided, not deferred: they're internal. Exporting them makes svelte-docsmith a worse shadcn-svelte, freezes ~20 components' APIs the project doesn't own, and doubles the public surface for zero differentiation — consumers who want buttons should get them from shadcn-svelte directly. Internal-only also keeps the door open to swapping/upgrading them (bits-ui 1→2, §0) without a semver-major.
5. **Types are exports, not ambient globals.** `WithChildren<T>` becomes an exported type from the lib root (or gets inlined away — with only a handful of uses, `{ children: Snippet } & T` written out may be clearer than a utility type). Nothing in the public surface may depend on a consumer's `app.d.ts`.

### 6.3 Supporting work, in priority order

1. **A real README for the library package** — installation, the two files above verbatim, the CSS contract, one "hello world" doc page. Written against the design, so writing it *first* (README-driven) is a legitimate way to pressure-test the API before implementing.
2. **The `docsmith.config.ts` schema** (§6.1) — start minimal: `title`, `github`, `nav` overrides only where derivation isn't enough. Resist adding options speculatively; every option is API surface to maintain.
3. **A scaffolding/init command** (`npx sv add`-style add-on or `npx svelte-docsmith init`) — generates the two files, the CSS contract, and one example page. Explicitly later (§7 stretch): don't build a CLI for an API that hasn't survived one real adoption yet.
4. **The adoption test as the acceptance gate**: before calling the API pass done, adopt svelte-docsmith into a *different* fresh SvelteKit project following only the README. Every point where you have to look at `sites/docs` source to proceed is a defect in the API or the docs, and becomes the punch list.

---

## 7. Sequencing / roadmap (next ~2–3 months, a few hours/week)

Each milestone is independently shippable and demoable — useful both for staying motivated solo and for having something concrete to point recruiters at along the way.

1. **Stabilize (Milestone: "it builds, and CI proves it").** §3 Step 0 — fix the interrupted migration, the dependency-declaration audit (`@lucide/svelte`, peer deps), and add the CI workflow gating PRs and the release job. No dependency bumps yet. Done when `pnpm typecheck`, `pnpm test`, `pnpm build` all pass clean at the repo root, CI enforces that on every PR, and the docs site actually renders in a browser via `pnpm dev`. This alone is a real, demoable milestone: "went from a broken repo to a working, CI-gated monorepo with a real published-shape library."
2. **Modernize the foundation.** §3 Steps 1–4 (Svelte/Kit/Vite bumps, staged as described) then Step 5 (Tailwind v4). The §2.5 styling-shipping decision must be made during this milestone, since it constrains how the Tailwind migration treats the library package. Done when the repo is on current-stable Svelte/Kit, Vite 7 (Vite 8 as a separate follow-up milestone if you want to isolate its risk further), and Tailwind v4, with full visual QA passed.
3. **Fix the markdown pipeline + flatten `sites/docs`.** §4 — swap the Shiki wiring to `@shikijs/rehype`, give velite its nav-generation job (§2.6), and while touching every widget anyway, drop the FSD scaffolding for the plain layout (§0 conclusion). Small, contained, and directly sets up milestone 4.
4. **API design doc, then first real content.** Write the §6 design down as the library README first (README-driven: the two-file adoption story, export layers, CSS contract), populate `index.ts` against it — tiers 1 and 2, shadcn primitives explicitly excluded — move `TableOfContents` into the library, fix the `WithChildren` type. Then author 3–5 real doc pages (getting-started, installation, a core-concepts page, an API reference page) using the fixed pipeline — validating it against real content for the first time and replacing the placeholder nav data. Demoable milestone: "a real, working, good-looking docs site with real content, built on a library with a designed public API."
5. **Ship build-time live examples v1.** §5 Milestones 1–2. This is the headline differentiator and the best single thing to point people at. Demoable milestone: "live, real, interactive Svelte components embedded in the docs, not screenshots."
6. **Packaging + adoption test.** Ship `svelte-docsmith/preprocess` (§6.2 item 1) and the `docsmith.config.ts` schema (§6.3 item 2), then run the acceptance gate: adopt svelte-docsmith into a *different* fresh project following only the README (§6.3 item 4). Every wall you hit is the next punch list. Demoable milestone: a second, unrelated project running on svelte-docsmith.
7. **Stretch, if time allows in this window:** scaffolding CLI (§6.3 item 3), or begin exploring editable-playground v2 (§5, out-of-scope note) — pick one, don't split focus across both.

---

## 8. Open-core / monetization notes

Brief, deliberately not designed yet — flagged for a later, dedicated pass once there's an actual working, adopted free product to build a paid tier on top of.

- **Plausible free tier:** the library and CLI/scaffolding as they're being built here — components, markdown pipeline, build-time live examples, self-hosted.
- **Plausible paid/pro surface, later:** hosted docs deployment (a Vercel-for-svelte-docsmith style one-click deploy + hosting product), the in-browser editable playground (§5 v2/v3) gated as a pro feature since it's genuinely expensive to build and operate (sandboxed execution, potential abuse surface if hosted), built-in search beyond what's free-tier-viable, analytics on doc usage, versioned-docs support (Starlight itself doesn't have this natively — noted as a competitive gap in §Decisions that could become a paid differentiator either way), and team/collaboration features (comments, review flows on docs content).
- **Explicitly not decided:** pricing, packaging boundaries, or whether hosted-vs-self-hosted is even the right axis to split on. Revisit once milestone 5–6 in §7 are real and there's actual usage signal to design against.
