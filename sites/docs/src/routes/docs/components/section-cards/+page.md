---
title: Section cards
description: A card for each page in a section, kept up to date from the sidebar.
section: Components
order: 28
since: '0.29'
---

<script>
	import { SectionCards, PropsTable } from 'svelte-docsmith';
	import sectionCardsProps from '$docsmith/components/docs/section-cards.svelte?props';
</script>

`SectionCards` lists the pages of a section as [cards](/docs/components/card),
each with the page's title, description and link, in the order the sidebar
shows them. It reads the pages from the site, so the list stays right as pages
are added, moved or renamed. Here it lists the Getting Started section:

<SectionCards section="Getting Started" />

## Usage

With no props, it lists the section the page is in, leaving out the page
itself. That makes an overview page for a section one line long:

```md
---
title: Components
section: Components
order: 8
---

Everything you can put in a page.

<SectionCards />
```

The [Components](/docs/components) page on this site is exactly that.

## Another section

`section` picks a section by name, the way a page names one in its `section`
frontmatter. A nested section is an array.

```svelte
<SectionCards section="Getting Started" />
<SectionCards section={['Guides', 'Advanced']} />
```

It lists one level. A section inside the one it lists shows as one card,
titled with its name and linking to its first page. A page with no
description gets a card with its title only.

## For agents

The cards come from the site, not from the page, so agents get them written
out as a list of links with each page's description:

```md
- [Introduction](/docs/introduction): What Svelte DocSmith is and who it is for.
- [Installation](/docs/installation): Add Svelte DocSmith to a SvelteKit project.
```

For that, `section` has to be written as a string or an array of strings.

## Props

<PropsTable of={sectionCardsProps} />
