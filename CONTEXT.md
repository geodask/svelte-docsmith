# Svelte DocSmith

A framework for building documentation sites with Svelte 5 and SvelteKit. The
language below covers how doc content is collected at build time, how the docs
for multiple releases of a library coexist on one site, and how one page is
resolved for rendering.

## Language

### Content pipeline

**Docs root**:
The directory of doc pages, `src/routes/docs` by default. Maps onto the docs
base.
_Avoid_: docs folder, content folder

**Docs base**:
The URL prefix the docs tree is served under, `/docs` by default. The URL-space
counterpart of the docs root, which is a directory.
_Avoid_: docs prefix, base path, content base

**Source page**:
One doc page as authored, before any index has derived anything from it. Every
index is a projection of the same source pages, which is what keeps them
agreeing on which pages exist and where they live.
_Avoid_: page entry, doc file

**Content index**:
The generated record of every doc page's frontmatter, URL, headings and reading
time. Imported eagerly, because navigation is built from it.
_Avoid_: nav index, docs index

**Search index**:
The generated record of every doc page's body text. Loaded lazily, the first
time a reader opens search.
_Avoid_: search docs

**LLM index**:
The generated record of every doc page's full markdown. Read on the server to
write `llms.txt` and `llms-full.txt`, so it never reaches a reader's browser.
_Avoid_: llms docs, ai index

### Versioning

**Current version**:
The documentation for the latest release. Served unprefixed at the docs root,
and the only version anyone edits.
_Avoid_: latest, stable, live, next

**Archived version**:
A frozen copy of the docs for a superseded release, served under its own URL
prefix and never edited afterwards.
_Avoid_: old version, previous version, snapshot

**Version base**:
The URL prefix owning one version: the docs base for the current version,
`<docs base>/<id>` for an archive. A page belongs to the version with the
longest base it sits under.
_Avoid_: version prefix, basePath, version root

**Active version**:
The version owning the page currently being read. Falls back to the current
version when the reader is off the docs tree. Distinct from the current version,
which never changes with the route.
_Avoid_: selected version, viewed version

**Archiving**:
Copying the current version into a new archived version, done once, at the
moment a breaking release ships.
_Avoid_: cutting a version, snapshotting

**Archive marker**:
The file that makes a directory an archived version rather than an ordinary
section of the current docs. Archiving writes it; the build requires it. Without
it the two are indistinguishable, since both are just a directory under the docs
root.
_Avoid_: archive flag, version marker, sentinel

**Version manifest**:
The resolved list of versions the build emits into the content index, giving
each version its version base and its landing page.
_Avoid_: versions config

### Rendering

**Page view**:
Everything the shell needs to render one doc page: the version owning it, its
place in the navigation, its neighbours and trail, and its content index entry.
Resolved from the content index and the version manifest against one URL.
_Avoid_: page state, page model
