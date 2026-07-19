# Contributing to svelte-docsmith

Thanks for your interest in improving svelte-docsmith. This guide covers how to
report things, set up the project, and get a change merged.

## Ways to contribute

- **Questions and "how do I..."** belong in [Discussions](https://github.com/geodask/svelte-docsmith/discussions),
  not issues. You'll usually get an answer faster there.
- **Bugs**: open a bug report and include a minimal reproduction. Without one, an
  issue usually can't be investigated.
- **Feature ideas**: open a feature request, or start a discussion if it's more
  of an open question. Describe the use case, not just the solution.
- **Docs**: fixes and improvements to the docs site are very welcome and often
  the easiest first contribution.

Please search existing issues and discussions before opening a new one.

## Project layout

This is a pnpm + turbo monorepo with two workspaces:

- `packages/svelte-docsmith`: the published library. Source of truth for all
  reusable components and utilities. Its public API is `src/lib/index.ts` plus
  the package `exports`; everything else is internal.
- `sites/docs`: the documentation site that consumes the library as a
  `workspace:*` dependency. This is the dogfooding app and where the markdown
  doc pages live.

## Development setup

You'll need a recent LTS Node (20 or newer) and pnpm. The repo pins pnpm via the
`packageManager` field, so the simplest way to get the right version is Corepack:

```bash
corepack enable
git clone https://github.com/geodask/svelte-docsmith.git
cd svelte-docsmith
pnpm install
```

Common commands (run from the repo root; turbo fans them out to both workspaces):

```bash
pnpm dev         # dev servers for both workspaces
pnpm build       # build the library and the docs site
pnpm test        # run the test suite (vitest)
pnpm typecheck   # svelte-check in both workspaces
pnpm lint        # prettier --check
pnpm format      # prettier --write
```

Scope a command to one workspace with turbo's filter flag, or `cd` into the
package and use its local scripts:

```bash
pnpm build --filter=svelte-docsmith
cd packages/svelte-docsmith && pnpm test
```

### Running a single test

Tests live in `packages/svelte-docsmith` (vitest). From that package:

```bash
pnpm vitest run src/lib/toc/from-content.svelte.test.ts
pnpm vitest run -t "some test name"
```

## Making a change

1. Create a branch off `master`.
2. Keep your change focused. Small, single-purpose PRs are easier to review and
   merge than large ones.
3. Match the existing code style. Formatting is handled by Prettier (tabs, single
   quotes, no trailing commas, 100 print width), so run `pnpm format` before
   committing and `pnpm lint` to check.
4. Add or update tests when you change behavior. New logic should come with
   coverage.
5. If you touch the library's public API (`src/lib/index.ts` or the export map),
   keep the surface minimal and intentional, and update the docs to match.

### Changesets

Releases are managed with [Changesets](https://github.com/changesets/changesets).
If your change is **consumer-facing** (anything that affects the published
`svelte-docsmith` package: components, config, types, behavior), add a changeset:

```bash
pnpm changeset
```

Pick the semver bump (the package is pre-1.0, so a `minor` may carry breaking
changes). Docs-only changes and internal refactors that don't affect consumers
don't need one.

### Commit messages

Use short, imperative [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, etc. Example:

```
fix: reserve mermaid diagram space with an SSR skeleton
```

## Opening a pull request

Before you open the PR, make sure these pass locally:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Fill in the PR template, link the issue it addresses, and describe what changed
and why. CI runs the same lint/typecheck/test/build gate, and a release only goes
out once those checks pass. A maintainer will review; please be patient, and feel
free to ping the PR if it goes quiet for a while.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](../LICENSE).
