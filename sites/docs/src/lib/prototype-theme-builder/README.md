# PROTOTYPE: theme builder and CLI handoff (throwaway)

Lives on the `claude/project-thread-hq6j7b` branch only. Not for merging.

**Questions**

1. What should the theme builder on `/themes` look like? Three structurally
   different variants: A "Guided steps", B "Editor" (light and dark side by
   side), C "Preset remix" (today's page plus a Customize dock).
2. Does the CLI handoff work end to end: `npx svelte-docsmith theme` opens the
   builder, the builder sends the theme back to a loopback server, with a
   paste code as the fallback?

**Run it**

```sh
pnpm --filter docs dev
# open http://localhost:5173/themes?variant=A  (← → or the black bar switch variants)

# in another terminal, from any project with a vite.config.ts:
node sites/docs/scripts/prototype-theme-cli.mjs --builder 'http://localhost:5173/themes?variant=B'
```

**Pieces**

- `core.ts`: pure logic. Guided inputs generate every token for both modes,
  overrides sit on top (a preset, a pasted file, the token editor), a control
  drops the overrides it moves. Theme file, theme link and paste code
  encodings.
- `builder.svelte.ts`: reactive wrapper, paints the site, reads `#theme=` and
  `?cli=&state=`, sends to the CLI by a top-level form POST.
- `variant-{a,b,c}.svelte`, `controls.svelte`, `export-panel.svelte`,
  `import-box.svelte`, `sample-page.svelte`, `switcher.svelte`.
- `../../../scripts/prototype-theme-cli.mjs`: the CLI side.
