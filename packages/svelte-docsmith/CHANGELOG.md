# svelte-docsmith

## 0.1.0

### Minor Changes

- 3657661: Initial public release of svelte-docsmith — a framework for building documentation sites with Svelte 5 + SvelteKit.

  - `docsmith()` markdown pipeline (mdsvex + Shiki dual-theme highlighting + heading anchors) and Vite plugin (frontmatter-driven content index + `?source` imports).
  - `DocsShell` layout, `LiveExample`, and docs components: `Tabs`/`TabItem`, `Callout`, `Steps`/`Step`, `Card`/`CardGrid`, `Accordion`/`AccordionItem`, `Badge`, `Kbd`, `FileTree`, `PropsTable`.
  - One-import theme contract (`svelte-docsmith/theme.css`) with a set of tweakcn-based theme presets and light/dark support.
  - `defineConfig()` for typed site configuration.
