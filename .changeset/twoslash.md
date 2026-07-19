---
'svelte-docsmith': minor
---

Add Twoslash, so a code sample can show real types on hover. Mark a fence with ```` ```ts twoslash ```` and the block is compiled by TypeScript, then annotated with the types it actually infers rather than ones written by hand beside the code. Svelte fences work too, via `twoslash-svelte`.

It is opt-in twice: `docsmith({ twoslash: true })` in the preprocessor, then per fence. `@shikijs/twoslash`, `twoslash-svelte`, and `typescript` are optional peer dependencies, loaded only when a fence asks for them, so sites that don't use Twoslash pay nothing.

Because the snippet really is compiled, it has to typecheck, and an unresolved import or a type error means there is no type to show. Rather than fail the build over one block, DocSmith falls back to an ordinary highlight and warns which block it was. The usual Twoslash directives apply: `// @errors: 2322` to show an error deliberately, `// @noErrors` to silence one, and `// ---cut---` to keep setup lines out of the rendered output while still compiling them.

The hover popup is restyled from the stock rich theme onto your design tokens, so it matches the site in both colour schemes.
