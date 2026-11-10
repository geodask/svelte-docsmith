---
title: Code blocks
description: Highlight lines, mark diffs, focus, flag errors, highlight words, and show install commands for every package manager.
section: Core Concepts
order: 6
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

Every fenced code block is highlighted by Shiki at build time. On top of that,
you annotate lines and words with comment markers written right in the code. The
marker comment is stripped from the rendered output, so what readers see stays
clean.

Each section below shows the markdown you write, then how it renders.

## Highlight a line

Append `// [!code highlight]` to a line (a real comment in the fence's language)
to give it a highlighted background.

You write:

<!-- prettier-ignore -->
```text
const site = {
	title: 'My Library' // [!code highlight]
};
```

Which renders as:

```ts
const site = {
	title: 'My Library' // [!code highlight]
};
```

## Additions and deletions

Mark a line with `// [!code ++]` for an addition or `// [!code --]` for a
deletion. They render with a colored background and a `+` / `-` gutter marker.

You write:

<!-- prettier-ignore -->
```text
export default {
	plugins: [tailwindcss(), sveltekit()],             // [!code --]
	plugins: [docsmith({ site }), tailwindcss(), sveltekit()], // [!code ++]
};
```

Which renders as:

```ts
export default {
	plugins: [tailwindcss(), sveltekit()], // [!code --]
	plugins: [docsmith({ site }), tailwindcss(), sveltekit()] // [!code ++]
};
```

## Focus

`// [!code focus]` dims the other lines so the eye lands on what matters. Hover
the rendered block to bring the rest back.

You write:

<!-- prettier-ignore -->
```text
function setup() {
	const app = createApp();
	app.use(docsmith()); // [!code focus]
	return app;
}
```

Which renders as:

```ts
function setup() {
	const app = createApp();
	app.use(docsmith()); // [!code focus]
	return app;
}
```

## Errors and warnings

`// [!code error]` and `// [!code warning]` tint a line red or amber, for
call-outs like a deprecated call or a footgun.

You write:

<!-- prettier-ignore -->
```text
const ok = readFile('./page.md');
const bad = readFile();                  // [!code error]
const risky = readFileSync('./page.md'); // [!code warning]
```

Which renders as:

```ts
const ok = readFile('./page.md');
const bad = readFile(); // [!code error]
const risky = readFileSync('./page.md'); // [!code warning]
```

## Highlight a word

`// [!code word:name]` highlights every occurrence of `name` on the next line.
Add a count like `word:name:2` to limit how many.

You write:

<!-- prettier-ignore -->
```text
const name = frontmatter.title; // [!code word:name]
```

Which renders as:

```ts
const name = frontmatter.title; // [!code word:name]
```

<Callout variant="tip" title="Markers use the fence's language">

Write the marker inside a comment your language understands: `//` for
JS/TS/Svelte, `#` for bash or YAML, `<!-- -->` for HTML. Shiki strips the comment
along with the marker, so it never ships to the reader. (To show a marker
literally instead of applying it, as the "You write" blocks above do, put it in a
plain `text` block.)

</Callout>

## Highlight lines by number

Comment markers can't reach every line. Inside a Svelte template region an HTML
comment is stripped without highlighting anything, so mark those lines from the
fence itself instead. A single line, a list, or a range all work.

````md
```svelte {4}
<DocsShell
	{content}
	pattern
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	copyPage
>
	{@render children()}
</DocsShell>
```
````

renders as:

```svelte {4}
<DocsShell
	{content}
	pattern
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	copyPage
>
	{@render children()}
</DocsShell>
```

Ranges and lists use the same syntax: `{2-4}`, `{1,5}`, or both together.

## Install commands

Add `pkg` after the language and write the commands for npm. Readers get a tab
for pnpm, npm, yarn and bun, and the choice they make is shared with every other
install block (and every `<Tabs syncKey="pkg">`) on the site.

````md
```bash pkg
npm install -D svelte-docsmith
npx sv create my-app
```
````

renders as:

```bash pkg
npm install -D svelte-docsmith
npx sv create my-app
```

Each line is converted on its own:

| You write                           | pnpm                       | yarn                       | bun                       |
| ----------------------------------- | -------------------------- | -------------------------- | ------------------------- |
| `npm install` / `npm i`             | `pnpm install`             | `yarn install`             | `bun install`             |
| `npm install a` (with `-D` or `-E`) | `pnpm add a`               | `yarn add a`               | `bun add a`               |
| `npx a`                             | `pnpm dlx a`               | `yarn dlx a`               | `bunx a`                  |
| `npm create a@latest app -- --flag` | `pnpm create a app --flag` | `yarn create a app --flag` | `bun create a app --flag` |
| `npm run dev -- --open`             | `pnpm run dev --open`      | `yarn run dev --open`      | `bun run dev --open`      |

A line with anything else, such as `npm ci` or a flag without a clear
equivalent, is shown as written in every tab rather than guessed at. Lines that
aren't npm commands, like `cd my-app` or a comment, are kept as they are. Coding
agents reading the page get all four versions.

## Filenames and line numbers

Add `title=` to label a block with the file it belongs to, and `showLineNumbers`
to number it. Pair `startLine=` with numbering when the snippet is lifted out of
a longer file, so the numbers match the real source.

````md
```ts title="vite.config.ts" showLineNumbers
import { docsmith } from 'svelte-docsmith/vite';
export default { plugins: [docsmith({ site })] };
```
````

renders as:

```ts title="vite.config.ts" showLineNumbers
import { docsmith } from 'svelte-docsmith/vite';
export default { plugins: [docsmith({ site })] };
```

Numbering every block by default is a `markdown` option of `docsmith()`, and a
single fence can still opt out with `noLineNumbers`:

```ts title="vite.config.ts"
docsmith({ site, markdown: { lineNumbers: true } });
```

## Real types on hover

Add `twoslash` to a TypeScript or Svelte fence and the block is run through the
TypeScript compiler, so hovering a token shows its actual inferred type rather
than a hand-written guess.

````md
```ts twoslash
const version = '0.9.0';
const parts = version.split('.').map(Number);
```
````

renders as (hover `parts` or `version`):

```ts twoslash
const version = '0.9.0';
const parts = version.split('.').map(Number);
```

Twoslash is opt-in twice over: enable it in the `markdown` options, then mark
the individual fences that want it.

```ts title="vite.config.ts"
docsmith({ site, markdown: { twoslash: true } });
```

It needs three optional peer dependencies, pulled in only if you use it:

```bash
npm i -D @shikijs/twoslash twoslash-svelte typescript
```

Because the snippet really is compiled, it has to typecheck: an unresolved
import or a type error means there is no type to show. Rather than fail your
build over one block, DocSmith falls back to an ordinary highlight and warns
which block it was. Use `// @errors: 2322` to show an error deliberately,
`// @noErrors` to silence one, and `// ---cut---` to hide setup lines from the
rendered output while still compiling them.
