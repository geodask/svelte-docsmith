---
'svelte-docsmith': minor
---

Check the links doc pages write, and declare outside paths. `vite build` now checks every link a doc page writes to a path under the docs base, markdown `[text](href)` and raw `<a href>` alike, relative links included, against the pages of every version, anchors included. It prints one report of every broken link, with its file, line and what is wrong (`no page at /docs/x`, or `no anchor #y on /docs/x` with the anchors that page has), then fails. `vite dev` prints the same report as a warning, and again whenever a page changes the set of broken links, but never fails. Links outside the docs base, to other origins, in code and in Svelte expressions are left alone.

For paths that something other than the app serves on the same origin, such as a Cloudflare Worker in front of a static build or a reverse proxy, declare them as outside paths: `links: { outside: ['/playground'] }`. A link to one is never a broken link, and DocSmith marks it `rel="external"` in doc pages and in the shell's `nav`, footer and announcement links, so SvelteKit's crawler skips it during prerender and a click loads it from the server. A doc page under an outside path fails the build. `svelte-docsmith/site` now also exports `outside`, the resolved outside paths.

```ts
// vite.config.ts
docsmith({
	site: { title: 'My Library' },
	links: {
		broken: 'error', // the default; or 'warn', or 'ignore'
		outside: ['/playground']
	}
});
```

**Upgrading:** the check is on by default with `broken: 'error'`, so the first build after upgrading can fail on links that were already broken. Set `links: { broken: 'warn' }` to build while you fix them, then remove it. If the report lists links to paths a Worker or proxy serves, add those prefixes to `links.outside` rather than turning the check off. An invalid `links.broken` or `links.outside` value now fails when Vite starts. A test that mocks `svelte-docsmith/site` with only `{ site }` and renders the shell must add `outside: []` to the mock. See https://docsmith.geodask.com/docs/links.
