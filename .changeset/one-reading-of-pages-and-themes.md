---
'svelte-docsmith': patch
---

An internal restructuring that fixes several places where two parts of the framework read the same thing differently.

- The table of contents rendered on the server now links to the ids the page really has. It used to read headings its own way, so `## my_prop` linked to `#myprop`, a heading repeated at another level was numbered differently from the page, a heading inside a list was missing, and a line starting with `##` inside an HTML block was listed as a heading.
- Every reader event now carries the same `path` for a page: the current path without a trailing slash. `copy_code` and `not_found` used to send the raw path, so with `trailingSlash` on a handler saw one page as two.
- A doc page is a `+page` file in any extension listed in `markdown.extensions`, everywhere: the indexes, the dev watcher, the broken-link check and `archive-version` now all follow the option. A `+page.svx` is no longer indexed unless `.svx` is listed.
- `svelte-docsmith theme` and the OG image colours read a theme file the way the plugin does, through comments, `@layer` and repeated blocks. The command takes any file that sets a custom property in `:root` or `.dark`.
- Agent markdown for a page with CRLF line endings keeps them throughout, and its `<SectionCards />` are written out.
- A frontmatter typo warning prints once per read of the docs instead of once per generated module.
- The `outside` export of `svelte-docsmith/site` is typed `readonly string[]`, as the option is.
