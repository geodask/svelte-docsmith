---
title: Writing pages
description: Frontmatter, live examples, and code highlighting in a page.
section: Core Concepts
order: 5
---

## A page is a file

Every page is a `+page.md` file under `src/routes/docs/`. The directory name is
the URL: `src/routes/docs/guides/routing/+page.md` serves `/docs/guides/routing`.
Create the file, and the page exists.

## Frontmatter

The frontmatter block at the top of each page drives the sidebar. Four fields:

| Field         | Required | Purpose                                                       |
| ------------- | -------- | ------------------------------------------------------------- |
| `title`       | yes      | The sidebar label and page heading.                           |
| `description` | no       | One-line summary, shown under the title.                      |
| `section`     | no       | Sidebar group heading. Entries without one fall under "Docs". |
| `order`       | no       | Sort key within the group.                                    |

```md
---
title: Routing
description: How pages map to URLs.
section: Guides
order: 1
---
```

`section` names the group and `order` sorts within it; groups themselves are
ordered by the smallest `order` they contain. A page with no `title` is skipped
by the sidebar — so if a page isn't showing up, check its frontmatter first.

## Headings

Don't write an `#` (h1) in the body — the `title` from frontmatter is the page
heading. Start your content at `##`. Every heading gets an anchor id
automatically, and the in-page table of contents is built from `##` and `###`
headings as the page renders.

## Code blocks

Fenced code blocks are highlighted by Shiki at build time — tag the fence with a
language. To emphasise a line, append the comment `// [!code highlight]` to it
(a real comment in that language); Shiki strips the comment and highlights the
line, like the second line below:

```ts
const docs = loadDocs();
const current = docs.find((d) => d.active); // [!code highlight]
```

Unknown languages fall back to plain text rather than failing the build, so a
stray ` ```mermaid ` won't break your site.

## Live examples

To show a real, running component next to its source, put the component in
`src/lib/examples/`. Import `LiveExample`, then import your component twice —
once as the component, and once with the `?source` query for its build-time
highlighted source — and pass both to `LiveExample`:

```md
<script>
  import { LiveExample } from 'svelte-docsmith';
  import Counter from '$lib/examples/counter.svelte';
  import counterSource from '$lib/examples/counter.svelte?source';
</script>

<LiveExample source={counterSource}>
  <Counter />
</LiveExample>
```

Both come from the same file, so the demo you render and the code you show can
never drift. See [Live Examples](/docs/live-examples) for a running one.

## Tabbed content

For alternatives — package managers, framework variants — group blocks with
`Tabs` and `TabItem`. Pass the tab labels as `items`; each `TabItem`'s `value`
matches one label:

````md
<script>
  import { Tabs, TabItem } from 'svelte-docsmith';
</script>

<Tabs items={['npm', 'pnpm']} value="npm">
<TabItem value="npm">

```bash
npm i -D svelte-docsmith
```

  </TabItem>
  <TabItem value="pnpm">

```bash
pnpm add -D svelte-docsmith
```

  </TabItem>
</Tabs>
````
