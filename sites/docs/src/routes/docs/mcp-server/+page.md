---
title: MCP server
description: Let a reader's coding agent list, search and read your docs from their editor.
section: Core Concepts
order: 11
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

<Callout variant="warning" title="Experimental">

The MCP server sits outside the 1.0 stability promise. `mcpServer`, its tools,
and the `mcp` config field may change in a minor release until authors have
used them for real.

</Callout>

Many readers now ask a coding agent how to use your library instead of opening
your docs. An MCP server lets that agent read the docs itself. The reader adds
one URL to Claude Code, Cursor or VS Code, and their agent can list your pages,
search them, and read any page in full.

The server answers from the same indexes as your search box and `llms.txt`, so
every surface agrees. Each page arrives as agent markdown: the page's prose,
with generated props tables written out as markdown tables and each
`LiveExample`'s source as a code block.

## Add the route

Add `src/routes/mcp/+server.ts` with `mcpServer` from `svelte-docsmith/server`:

```ts title="src/routes/mcp/+server.ts"
import { mcpServer } from 'svelte-docsmith/server';

export const prerender = false;
export const { GET, POST, OPTIONS } = mcpServer();
```

One handler answers all three methods. POST carries the agent's requests.
OPTIONS answers the CORS preflight, so browser-based agents can connect too. GET
is for a person who opens the URL in a browser: they get a short plain-text note
on adding the server to their editor.

It reads your site config and the generated indexes itself. Your site's `title`
and `description` tell the agent what the docs are about, and `url` makes the page
links it gets back absolute. It sees every version and scopes to one itself
(see [Versions](#versions)).

The server needs no auth and adds no dependencies to your site.

<Callout variant="note" title="It needs a server runtime">

The server answers each request as it arrives, so the route sets
`prerender = false`. Keep that line even if your layout prerenders everything.
Your site then needs a host that runs server code, such as Vercel, Netlify,
Cloudflare or Node. On a fully static host (`adapter-static`, GitHub Pages),
leave the route out. Nothing else depends on it.

</Callout>

## Tell readers about it

Set `mcp` in your `site` options to the route's path:

```ts title="vite.config.ts"
docsmith({
	site: {
		title: 'My Library',
		url: 'https://my-library.dev',
		mcp: '/mcp'
	}
});
```

Readers then find the server in two places:

- **The copy-page menu** gains a "Connect to your editor" item. It opens a
  dialog with the server's full URL and copy-paste setup for Claude Code,
  Cursor and VS Code. The menu needs `copyPage` on `DocsShell` (see
  [Copy page](/docs/seo#copy-page)).
- **`llms.txt`** gains an `MCP server: <url>` line under the description, so an
  agent that reads it learns it can connect. `llmsTxt()` reads it from the same
  config (see [llms.txt](/docs/seo#llmstxt)).

`mcp` takes a path on your site or a full URL. Leave it unset and neither the
menu item nor the `llms.txt` line appears.

For Claude Code, the reader's setup is one command. The server's name is your
site title as a slug:

```bash
claude mcp add --transport http my-library https://my-library.dev/mcp
```

## The tools

The server gives the agent three read-only tools:

| Tool          | What it does                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_pages`  | Lists every page in sidebar reading order, grouped by section, with its title, path and description.                                            |
| `search_docs` | Searches the docs for `query`. Returns ranked hits with title, path, section and a snippet. `limit` sets how many (default 8, at most 20).      |
| `get_page`    | Returns one page's agent markdown. `path` is a page path such as `/docs/theming` or a full URL on your site; a trailing `.md` or slash is fine. |

When `get_page` finds no page, it tells the agent to try `search_docs` or
`list_pages`.

### Versions

On a [versioned](/docs/versioning) site, every tool reads the current version
by default. Each one takes an optional `version` argument, a version id such as
`v1`, so an agent working against an older release reads the docs that match
it. An unknown id comes back as an error that lists the valid ones. On a site
without versions, the argument is ignored.

<Callout variant="tip">

This site runs one. Add `https://docsmith.geodask.com/mcp` to your editor, or
pick "Connect to your editor" from the menu next to "Copy page" at the top of
this page.

</Callout>
