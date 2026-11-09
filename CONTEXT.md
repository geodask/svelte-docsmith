# Svelte DocSmith

A documentation framework for Svelte 5 library authors: markdown doc pages, live
examples and API reference, all inside one real SvelteKit app.

## Language

### Configuration

**Site options**:
Everything passed to the one `docsmith()` call in `vite.config.ts`, the only
place a site is configured. The Vite plugin, the markdown compiler it runs and
the archive CLI all read them.
_Avoid_: config file, docsmith config, plugin options, preprocessor options

**Site config**:
The `site` group of the site options: title, links, SEO defaults and the rest
of what the shell and the route handlers show. Served to the browser as
`svelte-docsmith/site`, so it is plain data.
_Avoid_: siteConfig, DocsmithConfig, defineConfig

### Navigation

**Reading order**:
The order a reader meets pages in the sidebar: each page placed by its
`section` path, then sorted by `order` and title, with a group sorted by the
smallest `order` below it. The sidebar, the pager, `llms.txt`,
`llms-full.txt` and the MCP server's `list_pages` all follow it.
_Avoid_: sidebar order, nav order, sort order

### Shell

**Override**:
A snippet passed to `DocsShell` that replaces one part of the shell (the
sidebar, the TOC, the page header or the pager) inside the frame the shell
keeps. It receives the same object the built-in part takes as props, so it can
wrap that part.
_Avoid_: slot, component override, custom component

**Page header**:
The row above a doc page's content: breadcrumbs, reading time and Copy page.
_Avoid_: header (that is the site header across the top), page toolbar

**Pager**:
The previous and next links at the foot of a doc page, in reading order.
_Avoid_: prev/next nav, pagination

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
props that differ from the component's defaults, in declaration order.
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

### Links

**Broken link**:
A link written in a doc page, as markdown or as an HTML `<a>`, whose path sits
under the docs base but is no page of the site, or names an anchor its target
page doesn't have. Relative links count once resolved against the page's URL.
Links elsewhere on the site (`/`, `/llms.txt`) are the app's own business, and
links to an outside path are valid, so neither is ever a broken link.
_Avoid_: dead link, non-existent link, missing link

**Outside path**:
A same-origin path that something other than the docs site's SvelteKit app
serves, such as a Worker, a reverse proxy or another app. Declared by the
author as path prefixes; no doc page may live under one.
_Avoid_: external path (external means another origin), passthrough path

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
`llms-full.txt`, a page's agent markdown at `<path>.md`, the OG images, or the
MCP server. It reads the site config and the generated indexes itself and keeps
to the current version where that applies, so the author's route is one line.
_Avoid_: generator, endpoint helper, server route

**OG image**:
The 1200×630 picture a link preview shows for one doc page, drawn at build time
from the page's title, description and section in the site's theme colours.
Served by the `ogImages()` route handler under `site.ogImages`; pages that
aren't doc pages fall back to `site.ogImage`.
_Avoid_: social card, share image, preview image

**MCP server**:
An endpoint the author adds to their docs site that lets a reader's coding agent
list, search and read the docs' pages as agent markdown. Optional, and only
possible where the site has a server runtime.
_Avoid_: MCP endpoint, MCP route, docs API

### Reader events

**Reader event**:
Something a reader did on a docs site that only svelte-docsmith can see, such
as a feedback vote, a search, a 404 or a copied code block, passed to the
author's reader event handler. Pageviews and generic clicks are the analytics
provider's own business, so they are never reader events. svelte-docsmith
sends reader events nowhere itself.
_Avoid_: analytics event, tracking event, telemetry

**Reader event handler**:
The one function, named once in the site options, that receives every reader
event on every page of the site. The author forwards events from it to
whatever analytics they use.
_Avoid_: analytics adapter, tracker, feedback callback

### Theming

**Theme**:
The whole look of a site as one set of tokens: colours, radius, fonts,
shadows, spacing, letter spacing and code colours, each for both colour modes.
A preset or the author's own; a site has exactly one.
_Avoid_: skin, palette, style (and "theme" for light/dark or for Shiki)

**Preset**:
A theme that ships with the package, such as Ocean. Its CSS file is the source
of truth for its name and tokens. Darkmatter is the default preset.
_Avoid_: theme preset, built-in theme, template

**Colour mode**:
Light or dark. Every theme defines both; the reader switches between them.
_Avoid_: theme, dark theme, appearance

**Code theme**:
How code blocks are coloured. Part of a theme: its code colour tokens, or an
exact Shiki pair, one per colour mode, named by `codeTheme`.
_Avoid_: theme, syntax theme, highlighter theme

**Theme file**:
A CSS file of `:root` and `.dark` tokens in the shape shadcn and tweakcn
export. The one form a theme takes outside the package: what `docsmith({ theme })`
points at, the builder exports and the CLI writes.
_Avoid_: theme config, theme JSON, custom CSS

**Theme builder**:
The `/themes` page of the docs site, where an author starts from a preset or a
pasted theme file, adjusts it, previews it on a sample docs page and exports it.
_Avoid_: theme editor, theme generator, showcase

**Theme link**:
A theme builder URL that carries a whole theme, so opening it restores that
theme exactly. How the CLI handoff and agents pass a theme around.
_Avoid_: share link, permalink, theme URL

**Preset manifest**:
The ordered list of presets, read from their CSS files by
`packages/svelte-docsmith/scripts/theme-presets.mjs`. The docs site's theme
showcase and the scaffolder's theme prompt both come from it.
_Avoid_: theme list, PRESETS
