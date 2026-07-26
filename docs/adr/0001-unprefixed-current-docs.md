# Unprefixed current docs, prefixed archives

DocSmith needs to publish docs for more than one release of a library. The
obvious model, and the one we built first, is Docusaurus's: prefix every version
including the current one, and keep a stable `next` folder as the only place
authors edit. We rejected it. The current version is served unprefixed at the
docs root and is the folder authors edit; only superseded versions get a URL
prefix. There is no `next` version and no prerelease concept.

## Why

- Prefixing every version moves the canonical URL of every page on every
  release. Pre-1.0 minors in this repo carry breaking changes, so that is
  frequent, and every inbound link decays into an archived version.
- Versioning is opt-in on an already-shipping library. Prefixing everything
  forces every existing site to migrate every URL just to adopt it. Unprefixed
  current makes adoption a no-op until the first archive exists.
- The original argument for prefixing everything was that a clean `next` needs
  an edit folder that never moves. The docs root never moves either, and more
  permanently.
- Once the root is editable, `next` stops paying for itself. It becomes a full
  parallel tree that diverges from the root continuously, and promoting it on
  release destructively discards every fix made to the root since the fork.
  Docs for unreleased features are handled in-page instead.

## Considered options

- **Prefix every version by id** (`/docs/v2/theming`). Rejected for the URL churn
  and adoption cost above.
- **Prefix everything, but keep the current version at a stable `latest/`
  path.** Fixes the churn and needs no code change, but still forces every
  existing site to migrate its URLs once.
- **Overlay `next`**, holding only changed pages and falling through to current.
  Solves the divergence problem outright, but it is real machinery in content,
  nav and search resolution for a feature with no user yet.

## Consequences

- The vocabulary is *current*, not *latest*. Helpers and config keys follow.
- No redirect from the docs base is needed, and no landing-URL helper for one.
- A site with no archived versions renders no switcher and no banner, and emits
  byte-for-byte the same output as an unversioned site.
