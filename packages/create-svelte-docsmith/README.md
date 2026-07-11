# create-svelte-docsmith

Scaffold a documentation site powered by [Svelte DocSmith](https://www.npmjs.com/package/svelte-docsmith).

```bash
npm create svelte-docsmith@latest my-docs
```

```bash
pnpm create svelte-docsmith my-docs
```

```bash
yarn create svelte-docsmith my-docs
```

You can also run it without a name and answer the prompts:

```bash
npm create svelte-docsmith@latest
```

It asks a short set of questions (all with sensible defaults):

- **Directory** — where to create the project (skipped if you passed a name).
- **Site title** — used in the header and `site-config.ts`.
- **Theme** — a built-in preset, or the default.
- **Install dependencies?** — runs your package manager for you.
- **Initialize a git repository?**

Then it writes a ready-to-run SvelteKit + Tailwind v4 project wired with
DocSmith: the markdown pipeline, the Vite plugin, the style contract, a
`DocsShell` layout, a 404 page, and two sample doc pages.

```bash
cd my-docs
npm run dev
```

Add markdown files under `src/routes/docs/` and they appear in the sidebar,
styled, highlighted, and searchable.

## License

MIT
