# An archive freezes content, not dependencies

An archived version preserves that version's prose, code samples and URLs. It
does not preserve rendering, and it does not preserve runtime behaviour. Because
that trade has no users yet, the versioning API is excluded from the 1.0
stability promise.

## Why

The freeze boundary is the docs root. `archive-version` copies every file inside
it and nothing outside, so a page and any file beside it are frozen, while
everything the page imports resolves to whatever the app currently has
installed. One frozen content tree, dependencies that are never frozen.

That single rule produces three different failures:

- **Authoring components.** A renamed or removed export breaks the archive's
  build. Loud, and rare if we are careful.
- **The automatic pipeline.** The markdown tag map (`code`, `pre`, `h2`, `h3`,
  `table`), `rehypeSlug`, `rehypeSectionize` and Shiki apply to every archived
  page whether it imports anything or not. Changing any of them re-renders every
  archive with a green build and no warning. `b01d6b0` is exactly this class of
  change, and it is the most common kind we ship.
- **Live examples.** The worst case, and the one that cannot be closed. An
  example imports the library being documented. There is one copy of that
  library in the app and it is the current one, so an archived v1 page
  demonstrates v2 behaviour under a v1 URL, silently.

The third is a property of having one `node_modules`, not an implementation gap.
`LiveExample` is valuable precisely because the demo is the real component from
the real library; that requires resolving to the installed version, which is
exactly what makes it unfaithful in an archive. Fidelity and `LiveExample` are
mutually exclusive in a single-app model.

The ecosystem agrees. Docusaurus has had the identical problem open since
January 2020 (facebook/docusaurus#2234); its recommended `@site` alias resolves
to current source by design. MUI, Tailwind and Vue all publish a separate
deployment per version instead, which is the only model where a v1 example runs
v1 code, because that site has v1 installed.

## Considered options

- **Prebuilt static archives.** Already rejected in
  `0002-archives-are-rewritten-source-copies.md` as a different product. That
  holds, for a reason 0002 does not state: per-version deploys are branches,
  builds, routing and DNS, owned by the author, not a framework feature. In-repo
  archives buy one deploy, one nav, and a search index spanning versions, which
  per-version deploys cannot.
- **Follow the import graph and copy dependencies into the archive.** A
  bundler's job, leaks on transitive dependencies, and still cannot copy the
  version of the library being documented.
- **Freeze the authoring contract harder than semver**, so archived markdown
  never breaks across majors. Rejected once versioning left the stability
  promise: without an archive fidelity guarantee, the authoring components are
  ordinary public API and ordinary semver covers them.

## Consequences

- `CONTEXT.md` previously defined an archived version as "never edited
  afterwards", which was false. It now states what is actually preserved, and
  `Freeze boundary` is a defined term.
- `archive-version` should warn when a page it copies imports across the freeze
  boundary, turning a silent wrong demo into a notice while the terminal is
  still open.
- An external-URL variant of `DocsVersions` remains available as a purely
  additive change, letting an author who needs faithful demos deploy per version
  and still present one version switcher.
- 1.0's stability promise covers the authoring components, `DocsShell`,
  `defineConfig`, the preprocessor, the Vite plugin, the generators, search and
  theming, on ordinary semver. `DocsVersions`, the archive marker and the
  `archive-version` CLI sit outside it until real authors have used them.
