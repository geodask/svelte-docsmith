---
'svelte-docsmith': minor
---

Send what readers do in your docs to the analytics you already use. Name a handler module with `docsmith({ readerEvents: './src/lib/reader-events.ts' })` and its default export receives every **reader event**, in the browser only: `feedback` (a "Was this page helpful?" vote), `feedback_link` (the edit or issue link after a "No" vote), `search` (once per time the palette opens, with the query, the result count and the page picked or `null`), `not_found` (a 404 on `ErrorPage`, with the referrer), `page_action` (each Copy page menu item, MCP setup included) and `copy_code` (with the language, from a fence or a live example). Every event has a snake_case `type` and the page `path`, so `posthog.capture(event.type, event)` forwards it as is. The library itself still sends nothing anywhere, and a handler that throws is logged without breaking the page. Type the handler with the new `ReaderEventHandler` export; `ReaderEvent` and each event's type are exported too. Code blocks now pass their fence language to the `pre` component as `language`.

`DocsShell`'s `feedback` now only shows or hides the widget. Passing a callback (`feedback={(vote, path) => …}`) still works, alongside the `feedback` reader event, but is deprecated and stops working in the next minor: move it into your handler. See the new Reader events page.
