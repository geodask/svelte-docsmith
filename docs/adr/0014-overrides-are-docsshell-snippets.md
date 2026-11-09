# Overrides are `DocsShell` snippets

`DocsShell` took three snippets (`logo`, `actions`, `footer`), so an author could not replace the sidebar, the table of contents, the page header or the pager. The README promises that 1.0 locks `DocsShell`, so the way to replace a part has to be chosen before then: a second mechanism added later would mean a major.

Now an override is a snippet prop on `DocsShell`: `sidebar`, `toc`, `pageHeader` and `pager`. Each receives a small object made for its part (`{ nav }`, `{ items, activeId }`, `{ path, breadcrumbs, readingMinutes, copyPage }`, `{ prev, next }`). The built-in parts are exported as `Sidebar`, `TableOfContents`, `PageHeader` and `Pager`, each taking exactly its snippet's object, so an override can wrap the default by rendering it with the props it was given. The shell keeps each part's frame (the sticky columns, widths, breakpoints, the rule above the pager) and renders the sidebar and TOC overrides in the mobile menu and popover too.

## Considered Options

- **A `components` map** (`components={{ Sidebar: MySidebar }}`). Rejected: in Svelte 5 a snippet is the idiomatic way to hand markup to a component, the existing `logo`, `actions` and `footer` are snippets, and a map would need its own typing for each part's props where a snippet's argument is typed for free.
- **File overrides in `docsmith({ components })`**, as Starlight does, resolved by the Vite plugin. Rejected: build-time aliasing to replace a component the author renders themselves, an override that doesn't show at the call site, and a restart to change it. It would reach `ErrorPage` too, but that only renders the `page` layout, which has none of these parts.
- **Passing the shell's resolved page view (`DocsPageView`) to every snippet.** Rejected: it would freeze an internal shape that changes whenever the shell learns a new rule. Each part gets only what it shows.
- **Passing the built-in part to the snippet as a second argument** instead of exporting it. Rejected: the author could not change the props it renders with, and the export costs nothing more, since its props are the snippet's argument.
- **Overriding every part now** (the site header, the edit link and last-updated row, the feedback widget). Rejected: a new snippet prop is additive, so only the mechanism has to exist before 1.0. More parts follow when an author asks.

## Consequences

- Overrides, the four parts and their prop types (`SidebarProps`, `TableOfContentsProps`, `PageHeaderProps`, `PagerProps`) are inside the 1.0 promise, along with what they carry: `NavGroup`, `NavItem`, `NavNode`, `Breadcrumb`, `TocItem` and `isNavGroup`.
- A part's frame is not the author's: an override can't move the sidebar to the right or drop its column. `layout="page"` remains the way to drop the side columns.
- Adding a field to a part's object is a minor; removing or renaming one is a major.
