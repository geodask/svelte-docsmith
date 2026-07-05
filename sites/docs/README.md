# Svelte DocSmith — documentation site

The official documentation site for [`svelte-docsmith`](../../packages/svelte-docsmith),
and the reference app that dogfoods the library end to end. Every page here is
built with the same public API the package ships to consumers.

## Stack

- **SvelteKit + Svelte 5** — routes under `src/routes/`.
- **`svelte-docsmith`** (as a `workspace:*` dependency) — the `docsmith()`
  preprocessor and Vite plugin, `DocsShell`, `LiveExample`, the theme contract,
  and every docs component.
- **Tailwind v4** — via `@tailwindcss/vite`, with `svelte-docsmith/theme.css`
  imported in the root stylesheet.

## How it works

- Doc pages are `+page.md` files under `src/routes/docs/`. Frontmatter
  (`title`, `section`, `order`) drives the sidebar; the body is markdown.
- `docsmith()` in `svelte.config.js` runs the mdsvex + Shiki pipeline;
  `docsmith()` in `vite.config.ts` scans frontmatter into the generated
  `svelte-docsmith/content` index and serves `?source` imports for live
  examples.
- `src/lib/` is a flat layout: `components/`, `examples/`, `site-config.ts`
  (the single site config, including the version pulled from the library's
  `package.json`), and the theme data/store.

## Develop

From the repo root (fans out to both workspaces via turbo):

```bash
pnpm install
pnpm dev            # docs + library dev servers
```

Or scope to this site:

```bash
pnpm dev --filter=docs
```

> The docs consume the library's **built** `dist/`. After editing library
> source, rebuild it (`pnpm build --filter=svelte-docsmith`) or the dev server
> shows stale behavior.

## Build

```bash
pnpm build --filter=docs      # plain `vite build`
```

## License

MIT — see [LICENSE](../../LICENSE).
