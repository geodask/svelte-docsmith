# Archived docs are rewritten source copies in the same app

Archiving copies the docs root into a frozen version folder inside the same
SvelteKit app. The archive command rewrites in-content links that point under
the docs base so they carry the archive's prefix, and freezes each page's real
last-updated date into its frontmatter. Versions stay declared in `docsmith()`
in the Vite config; the command prints the config replacement to paste rather
than editing it.

## Why rewrite links

Absolute in-content links like `](/docs/theming)` resolve to the current docs
forever. A verbatim copy would silently send a reader from an archived page into
current content, with no banner and no signal that the version changed. The
archive would be frozen in name only. Rewriting happens once, at copy time, and
is visible in the commit diff.

## Why the config step stays manual

Archiving happens once per major release. A typed config with autocomplete and
no second config file beats automating a yearly two-line edit, and the paste
lands in a diff that is already being reviewed. Moving `versions` into a JSON
manifest so the command could own it end to end was considered and rejected on
those grounds.

## Consequences

These are accepted costs, not oversights.

- Archived pages are compiled by the current pipeline, so a breaking change to a
  docs component alters or breaks every archive. The only real escape is
  publishing archives as prebuilt static output, which is a different product.
- Each archive grows the eagerly-imported content index and the lazily-loaded
  search index linearly. Search results are scoped to one version, so an
  archive's body text is dead weight to every reader not reading that archive.
  The `search` prop therefore takes the active version id, so per-version chunks
  can be introduced later without breaking consumers.
- Archive folders duplicate their files in git permanently.
- The command mutates markdown as it copies, so its output wants the same review
  as any other generated code.
