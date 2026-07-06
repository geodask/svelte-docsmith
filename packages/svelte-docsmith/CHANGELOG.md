# svelte-docsmith

## 0.2.0

### Minor Changes

- f1c64e5: Add the `darkmatter` theme preset (`svelte-docsmith/themes/darkmatter.css`) — a near-monochrome shell with a warm orange primary and muted teal secondary, in light and dark.

  Add a "Powered by Svelte DocSmith" attribution to the footer. It is shown by default whenever a footer is configured; opt out with `footer.poweredBy: false` in your `DocsmithConfig`.

## 0.1.1

### Patch Changes

- 1329d85: Declare all runtime dependencies. `@lucide/svelte`, `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, and `@fontsource-variable/inter` were devDependencies, so installs outside this monorepo failed to resolve imports from the shipped components and `theme.css`. They are now regular dependencies.

## 0.1.0

### Minor Changes

- 3657661: Initial public release of svelte-docsmith — a framework for building documentation sites with Svelte 5 + SvelteKit.

  - `docsmith()` markdown pipeline (mdsvex + Shiki dual-theme highlighting + heading anchors) and Vite plugin (frontmatter-driven content index + `?source` imports).
  - `DocsShell` layout, `LiveExample`, and docs components: `Tabs`/`TabItem`, `Callout`, `Steps`/`Step`, `Card`/`CardGrid`, `Accordion`/`AccordionItem`, `Badge`, `Kbd`, `FileTree`, `PropsTable`.
  - One-import theme contract (`svelte-docsmith/theme.css`) with a set of tweakcn-based theme presets and light/dark support.
  - `defineConfig()` for typed site configuration.
