---
title: Reader events
description: Send feedback votes, searches, 404s and copies to the analytics you already use.
section: Core Concepts
order: 16
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

Your analytics already count pageviews. What they can't see is what readers do
inside the docs: what they searched for and whether it found anything, which
links led to a 404, which code they copied, whether a page helped. Svelte
DocSmith sees those, and reports each one as a **reader event** to a handler you
write. It sends nothing anywhere itself, so you choose where the events go, and
there is no extra script, cookie or consent question from the library.

## Name a handler

Point `readerEvents` in `docsmith()` at a module. Its default export receives
every reader event on every page, only ever in the browser:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Docs' },
	readerEvents: './src/lib/reader-events.ts'
});
```

```ts title="src/lib/reader-events.ts"
import type { ReaderEventHandler } from 'svelte-docsmith';

const readerEvents: ReaderEventHandler = (event) => {
	console.log(event.type, event);
};

export default readerEvents;
```

That one handler covers the docs layout, the landing page, the error page and
search, with nothing to pass to `DocsShell` or `ErrorPage`. A handler that
throws is logged to the console and never breaks the page. Events fire in
`vite dev` too, so check `import.meta.env.DEV` if you only want production
traffic.

## The events

Every event has a `type` and a `path`, the page the reader was on. The `path`
never ends in a slash (except `/` itself), whatever your `trailingSlash`
setting, so one page is always one path. The types are snake_case, which every
analytics provider accepts as an event name, so a handler can usually forward
them unchanged.

| `type`          | Sent when                                                                                       | Also carries                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `feedback`      | The reader votes on "Was this page helpful?", once per page.                                    | `vote`: `'up'` or `'down'`                                                                                                   |
| `feedback_link` | The reader follows "Edit this page" or "Open an issue" after a "No" vote.                       | `link`: `'edit'` or `'issue'`                                                                                                |
| `search`        | The search palette closes, or the reader picks a result. Once per time it opens, never per key. | `query`, `results` (how many it found), `picked` (the result's path, or `null`)                                              |
| `not_found`     | `ErrorPage` shows a 404, on landing and on each client-side navigation to another missing path. | `referrer`: the page that linked here, or `null`. `path` is the missing URL.                                                 |
| `page_action`   | The reader uses an item of the page header's Copy page menu.                                    | `action`: `copy_markdown`, `view_markdown`, `open_chatgpt`, `open_claude`, `copy_mcp_url`, or `copy_mcp_setup` with `editor` |
| `copy_code`     | The reader copies a code block.                                                                 | `language` (or `null`), `source`: `'fence'` or `'live_example'`                                                              |

A `search` with `results: 0` and `picked: null` is a search that found nothing,
and the most direct pointer to a page you are missing. A `not_found` with a
referrer on your own site is a broken link to fix. The feedback widget only
shows with `feedback` on `DocsShell`; see [Configuration](/docs/configuration#docsshell).

<Callout variant="note" title="Search queries are what readers typed">
	The `query` of a `search` event is raw reader input. Readers sometimes paste
	things into a search box that they wouldn't want stored, so treat it like any
	other free text your analytics keep, and say on your privacy page that you
	collect it.
</Callout>

## PostHog

Start PostHog in the root layout for pageviews, as usual, and forward each event
by its type:

```ts title="src/lib/reader-events.ts"
import posthog from 'posthog-js';
import type { ReaderEventHandler } from 'svelte-docsmith';

const readerEvents: ReaderEventHandler = (event) => {
	posthog.capture(event.type, event);
};

export default readerEvents;
```

The error page reports a 404 as it mounts, which can be before your root
layout's `onMount` has started PostHog. If you start PostHog there, start it from
the handler too (make starting safe to call twice), as this site does.

## Plausible

Plausible takes a name and scalar `props`. Add each type you want to see as a
custom event goal in your Plausible site settings:

```ts title="src/lib/reader-events.ts"
import type { ReaderEventHandler } from 'svelte-docsmith';

declare global {
	interface Window {
		plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
	}
}

const readerEvents: ReaderEventHandler = ({ type, ...props }) => {
	window.plausible?.(type, { props });
};

export default readerEvents;
```

## Google Analytics

GA4 takes the type as the event name and the rest as parameters. Register the
parameters you want to report on as custom dimensions:

```ts title="src/lib/reader-events.ts"
import type { ReaderEventHandler } from 'svelte-docsmith';

declare global {
	interface Window {
		gtag?: (command: 'event', name: string, params: Record<string, unknown>) => void;
	}
}

const readerEvents: ReaderEventHandler = ({ type, ...params }) => {
	window.gtag?.('event', type, params);
};

export default readerEvents;
```

## What isn't a reader event

Pageviews, time on page and generic clicks are your analytics' own job, so the
library doesn't report them. Neither are agent reads: a coding agent fetching
`llms.txt`, a page's `.md` or the [MCP server](/docs/mcp-server) happens on the
server, often as a prerendered file, where no browser handler runs.
