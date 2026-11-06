# Svelte DocSmith

A documentation framework for Svelte 5 library authors: markdown doc pages, live
examples and API reference, all inside one real SvelteKit app.

## Language

### Navigation

**Reading order**:
The order a reader meets pages in the sidebar: each page placed by its
`section` path, then sorted by `order` and title, with a group sorted by the
smallest `order` below it. The sidebar, the prev/next pager, `llms.txt`,
`llms-full.txt` and the MCP server's `list_pages` all follow it.
_Avoid_: sidebar order, nav order, sort order

### Component API reference

**Prop**:
One member of a component's `$props()`. Snippets (including `children`),
callbacks and bindable values are all props.
_Avoid_: attribute, argument, option, slot, event

**Props table**:
The API reference for one component on a doc page, listing its props one per row.
_Avoid_: API table, type table, props grid

**Prop row**:
One entry in a props table: a prop's name, type, default, required/bindable
marks and description.
_Avoid_: prop line, field

**Generated props table**:
A props table derived entirely from the component's own source, with no content
written on the doc page.
_Avoid_: auto table, auto type table, docgen table

**Props import**:
Importing a component file with the `?props` query, which yields that
component's extracted props for a generated props table.
_Avoid_: docgen data, props metadata, props JSON

**Hand-written props table**:
A props table whose rows the author writes on the doc page.
_Avoid_: manual table, static table

**Inherited attributes**:
What a component accepts by spreading its remaining props onto something else:
an element's native attributes, or every prop of another component's type. They
are summarised by what they belong to, never listed as props.
_Avoid_: rest props, passthrough props, HTML props, inherited props

### Props playground

**Props playground**:
A live example with controls for the component's props, generated from the
same props import as its props table. The reader changes a control and the
example re-renders with the new value.
_Avoid_: story, sandbox, knobs, live editor

**Control**:
The input a props playground shows for one prop, chosen from its type: a
switch, a text or number field, or a choice of literal values. Props whose
type allows none (snippets, callbacks, objects) have no control.
_Avoid_: knob, arg control, field

**Starting values**:
The values a props playground begins with and resets to: the author's `args`,
then each prop's literal default. A prop with neither starts unset.
_Avoid_: initial args, defaults (those are the component's own)

**Usage line**:
The markup a props playground shows for its current values, listing only the
props that differ from the component's defaults.
_Avoid_: code preview, generated source

### Doc page frontmatter

**Built-in field**:
A frontmatter key svelte-docsmith reads itself to place and describe a page:
`title`, `description`, `section`, `order`, `lastUpdated`. Always type-checked.
_Avoid_: known field, reserved key, standard field

**Custom field**:
Any other frontmatter key. Kept as written and exposed on the page's content
entry as `data`, typed by extending `DocsCustomFields`.
_Avoid_: extra, extension field, author's own frontmatter, metadata

**Frontmatter schema**:
The optional Standard Schema passed to `docsmith({ schema })`. It checks custom
fields only, and never changes them.
_Avoid_: docs schema, content schema, collection schema

### Code blocks

**Code block**:
Highlighted code on a page: a markdown fence, or a LiveExample's source panel
from a `?source` import. A ```mermaid fence is a diagram, not a code block.
_Avoid_: snippet, code sample, fence (for the rendered result)

**Code block renderer**:
The build-time module that decides how every code block is drawn (language
fallback, fence meta, line numbers, Twoslash, diagrams) and the only place that
writes it into Svelte markup. Fences and `?source` imports both use it.
_Avoid_: highlighter, Shiki wrapper

### Agent access

**Agent markdown**:
A doc page's markdown as coding agents receive it: the page's prose with its
generated props tables written out as markdown tables and its live examples'
source written out as code blocks. The same text everywhere an agent reads a
page.
_Avoid_: LLM content, raw markdown, page markdown (that is the `+page.md` the
author writes)

**Route handler**:
A ready request handler from `svelte-docsmith/server` for one file a docs site
serves besides its pages: the sitemap, the changelog feed, `llms.txt`,
`llms-full.txt`, a page's agent markdown at `<path>.md`, or the MCP server. It
reads the generated indexes itself and keeps to the current version where that
applies, so the author's route is one line over the site config.
_Avoid_: generator, endpoint helper, server route

**MCP server**:
An endpoint the author adds to their docs site that lets a reader's coding agent
list, search and read the docs' pages as agent markdown. Optional, and only
possible where the site has a server runtime.
_Avoid_: MCP endpoint, MCP route, docs API
