---
title: Code blocks
description: Highlight lines, mark diffs, focus, flag errors, and highlight words.
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
const config = defineConfig({
	title: 'My Library' // [!code highlight]
});
```

Which renders as:

```ts
const config = defineConfig({
	title: 'My Library' // [!code highlight]
});
```

## Additions and deletions

Mark a line with `// [!code ++]` for an addition or `// [!code --]` for a
deletion. They render with a colored background and a `+` / `-` gutter marker.

You write:

<!-- prettier-ignore -->
```text
export default {
	preprocess: [vitePreprocess()],             // [!code --]
	preprocess: [vitePreprocess(), docsmith()], // [!code ++]
};
```

Which renders as:

```ts
export default {
	preprocess: [vitePreprocess()], // [!code --]
	preprocess: [vitePreprocess(), docsmith()] // [!code ++]
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

## Filenames and line numbers

Add `title=` to label a block with the file it belongs to, and `showLineNumbers`
to number it. Pair `startLine=` with numbering when the snippet is lifted out of
a longer file, so the numbers match the real source.

````md
```ts title="vite.config.ts" showLineNumbers
import { docsmith } from 'svelte-docsmith/vite';
export default { plugins: [docsmith()] };
```
````

renders as:

```ts title="vite.config.ts" showLineNumbers
import { docsmith } from 'svelte-docsmith/vite';
export default { plugins: [docsmith()] };
```

Numbering every block by default is a preprocessor option, and a single fence
can still opt out with `noLineNumbers`:

```js title="svelte.config.js"
docsmith({ lineNumbers: true });
```
