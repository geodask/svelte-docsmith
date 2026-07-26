# The archive marker defines an archive

`archive-version` writes a `.docsmith-archive` file into every archive it
creates. That file is not a hint or a convenience for the command: it is the
definition of an archived version on disk, and the build reads it. A directory
under the docs root is an archive if and only if it carries the marker and is
declared in `docsmith({ versions })`. Any other combination fails the build.

## Why

Versions are declared by hand in the Vite config, deliberately, per
`0002-archives-are-rewritten-source-copies.md`. That leaves the config and the
disk as two independent statements about which versions exist, and nothing was
checking that they agree.

The check cannot be done by name. `versionOf` classifies a page by its first
directory segment under the docs root, so `docs/guides/getting-started/+page.md`
and `docs/v1/getting-started/+page.md` are the same shape. Section folders and
archive folders are indistinguishable without a signal in the directory itself.
Absent one, both mismatches are silent and both corrupt the content index:

- An archive on disk that the config does not declare is merged into the current
  version, and its pages take current-version URLs in the sidebar.
- A section folder the config wrongly declares as an archive has all of its
  pages scoped out of the current version's sidebar and search.

The marker is the signal. Making it authoritative in both directions turns two
silent corruptions into two build errors, and the errors are actionable: the
command already prints the config block to paste, so the error can reprint it.

## Considered options

- **Treat the marker as a one-way hint.** An undeclared marker is an error, but
  a declared directory is accepted with or without one. Catches the first
  mismatch and leaves the second, which is the same class of bug.
- **Drop the marker and let the config be the sole authority.** Simplest, and it
  removes a dotfile from the tree. But it makes the undeclared-archive case
  undetectable by construction, which is the case that motivated the change, and
  it costs the command its own "do not copy an existing archive into the new
  one" check.
- **Infer archives from the id shape**, for instance treating any top-level
  directory matching `v\d+` as an archive. Guesses at a naming convention the
  library does not impose, and breaks the moment someone writes a section called
  `v2-migration`.

## Consequences

- The marker is public contract, not an implementation detail. It is documented
  on the versioning page, and removing or renaming it is a breaking change.
- An archive copied by hand rather than by `archive-version` must have a marker.
  The error message says so.
- Adding an archive is a two-step operation that fails loudly in between: the
  command creates the marked folder, and the build stays broken until the
  matching `versions` entry is pasted. That window is intentional. It is the
  reminder, and it lands while the terminal is still open.
- The check runs identically in dev and build, so a stale checkout fails the
  same way locally and in CI.
