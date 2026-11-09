# Reader events go to one handler named in `docsmith()`

The library shipped no analytics, and its only hook was `DocsShell`'s `feedback` callback for the thumbs vote. The docs site measured everything else by hand: it wired PostHog in its own `analytics.ts` and reported 404s from its own `+error.svelte`. Any other site that wanted to know what readers searched for, which 404s they hit or which code they copied had to reach into the library's components, and mostly couldn't.

Now the library reports **reader events**: the reader actions only it can see (a feedback vote, the links offered after a "No" vote, a search, a 404, a page header action, a copied code block). Every event goes to one **reader event handler**, a module the author names once in the `docsmith()` options. Its default export receives each event as one member of a discriminated union with a snake_case `type` and the page `path`. The plugin serves the module as a virtual module that `DocsShell`, `ErrorPage` and search import. The handler runs only in the browser. The library loads no tracker and sends no request of its own.

## Considered Options

- **Built-in providers** (`docsmith({ analytics: { provider: 'posthog', key } })`), as Docusaurus's gtag plugin and Mintlify do. Rejected: pageviews are what every provider already does well, so the library would be wrapping SDKs it doesn't own, taking on their versions, their consent questions and a growing list of providers. The events only svelte-docsmith can see are the part worth shipping. A docs recipe per provider gives the rest.
- **A prop on `DocsShell` and `ErrorPage`**, extending today's `feedback` callback. Rejected: a site renders `DocsShell` in many places (the docs site has six, and `ErrorPage` is separate), so a shell the author forgets goes silent, for example search opened from the landing page. A handler named once reaches every page.
- **Putting the handler in the site config.** Not possible: the site config reaches the browser as JSON, so it must be plain data (ADR 0009). A module path is plain data, and the plugin turns it into an import.
- **A register function** (`onReaderEvent(fn)` called in the root layout). Rejected: global mutable state that is easy to register twice, and nothing ties it to the site options.
- **A named callback per event.** Rejected: every new event would add API, where a union grows without changing the handler's signature, and forwarding to a provider stays one line.

## Consequences

- `feedback` on `DocsShell` only shows or hides the widget. The function form is deprecated for one minor, then removed.
- The event union, its `type` names and their fields are public API: adding an event or a field is a minor, while renaming or removing one is a major.
- Type names are snake_case without a prefix, because GA4 rejects hyphens. An author who wants a prefix adds it in the handler.
- Search reports one event each time the dialog is open, not one per keystroke. Search queries are raw reader input, and the docs say so.
- Agent reads (`llms.txt`, a page's `.md`, MCP calls) are not reader events. They happen on the server, often as prerendered files no handler sees, and need a separate hook if they come.
