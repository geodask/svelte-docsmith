---
'svelte-docsmith': minor
---

**Breaking:** the whole site is now configured in one `docsmith()` call in `vite.config.ts`. The markdown preprocessor and `defineConfig` are gone: `docsmith()` compiles your `.md` pages itself and serves the site config to `DocsShell`, `ErrorPage` and the route handlers, so nothing takes it as an argument anymore. Code block themes are set once for markdown fences and LiveExample source alike, and `svelte-docsmith archive-version` reads your docs directory and versions from the same options, then prints the exact `versions` block to paste.

To migrate:

1. Move the contents of `defineConfig({...})` (usually `src/lib/site-config.ts`) into `docsmith({ site: {...} })` and delete the file. The site config is now plain data checked when Vite starts.
2. Remove the `svelte-docsmith/preprocess` import and its entry from `preprocess`. Move its options under `markdown` (`langs`, `twoslash`, `lineNumbers`, `layout`, `extensions`, `remarkPlugins`, `rehypePlugins`), except `themes`, which moves to the top level and now covers `?source` too. Keep `extensions: ['.svelte', '.md']` in SvelteKit's config.
3. Replace `changelog: 'path'` and `changelogPath: '/route'` with `changelog: { file: 'path', path: '/route' }`.
4. Drop `config={siteConfig}` from `DocsShell` and `ErrorPage`, and the argument from the route handlers: `sitemap({ extra })`, `changelogFeed()`, `llmsTxt()`, `llmsFullTxt()`, `mcpServer()`. A page of your own that needs the config imports `{ site }` from `svelte-docsmith/site`.
5. Run `archive-version` from your docs app. `--content` and `--routes` are gone; pass `--config <file>` if your vite config is somewhere else.

```ts
// vite.config.ts
docsmith({
	site: { title: 'My Library', url: 'https://my-library.dev', nav: [/* … */] },
	themes: { light: 'github-light', dark: 'github-dark' },
	markdown: { twoslash: true },
	changelog: { file: '../../packages/my-lib/CHANGELOG.md' }
});
```

The renamed types: `DocsmithConfig` is now `DocsmithSite`, and `svelte-docsmith/vite` exports `DocsmithOptions` (was `DocsmithViteOptions`), `DocsmithMarkdownOptions` and `DocsmithChangelogOptions`. `RouteSite` is gone from `svelte-docsmith/server`.
