# One `docsmith()` call configures the whole site

A site used to be configured in three places that had to agree: `docsmith({...})` from `svelte-docsmith/vite` (content directory, versions, changelog, Shiki themes), `docsmith({...})` from `svelte-docsmith/preprocess` (themes again, Twoslash, languages), and `defineConfig` in `$lib/site-config.ts` (title, URL, nav, MCP path), passed by hand to `DocsShell`, `ErrorPage` and every route handler. The archive CLI took the content and routes directories a fourth time as flags, and couldn't read `versions` at all. Nothing made these agree, and the two `themes` options could silently differ.

Now the `docsmith()` Vite plugin is the only entry point. Its options hold the site config under `site`, the markdown options under `markdown`, and the shared build settings (`content`, `routes`, `versions`, `themes`, `changelog`) at the top level. The plugin compiles markdown itself, serves `site` as the virtual module `svelte-docsmith/site` for the shell and the route handlers to import, and carries its options on the content plugin's `api` for the archive CLI, which loads `vite.config` with Vite's own loader to read them.

## Considered Options

- **A separate `docsmith.config.ts`** that `vite.config`, `svelte.config.js` and the CLI all import. Rejected: it adds a fourth file to look in, and `svelte.config.js` would have to import TypeScript.
- **`docsmith()` returning a preprocessor for the author to place in `preprocess`.** Rejected: one more thing to wire by hand, and nothing stops the author from wiring two. The plugin compiles markdown as a Vite transform ordered before vite-plugin-svelte's preprocess step instead, which is the route vite-plugin-svelte 7 documents after removing `api.sveltePreprocess`.
- **Keep passing the site config as an argument** (`config={site}`, `sitemap(site)`) but from the served module. Rejected: it keeps a hand-threaded value with exactly one correct choice.
- **Deprecating the old entry points for a minor.** Rejected: a `markdown()` left in `preprocess` next to the new transform would compile every page twice, so the shim would have had to ignore its own options. Pre-1.0, a clean break with migration notes was cheaper.

## Consequences

- The site config reaches the browser as JSON, so it must be plain data. The plugin checks this, and the rest of the site config, when Vite starts.
- Editing the site config restarts the dev server rather than hot-reloading, because it lives in `vite.config`.
- `svelte-docsmith/site`'s fallback, unlike the other virtual modules', does not throw on import: `DocsShell` is in the main entry beside components that work without the plugin, so it throws when read instead.
- The archive CLI evaluates the site's `vite.config` to run (plugin factories run, plugin hooks don't), so it needs the app's dependencies installed, as `vite build` does.
