---
title: Landing Page
description: Build the marketing page that sits in front of your docs.
section: Components
order: 18
---

<script>
	import { PropsTable, Prop } from 'svelte-docsmith';
</script>

Five components compose the page in front of your docs: `Hero`, `FeatureGrid`
with `Feature`, `CTA`, and the `Action` link the first and third share. Each one
renders its own full-width `<section>` with the container, padding, and vertical
rhythm already set, so a landing page is a handful of components rather than a
wall of layout classes.

They draw every colour from the same design tokens as your docs, so they follow
your theme preset and both colour schemes with nothing to configure.

## Usage

Pass `layout="page"` to `DocsShell` so the shell drops the sidebar and table of
contents and gives the sections the full width of the viewport.

```svelte
<script>
	import { docs } from 'svelte-docsmith/content';
	import { DocsShell, Hero, FeatureGrid, Feature, CTA, Action } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<DocsShell config={siteConfig} content={docs} layout="page" pattern>
	<Hero title="Your project" description="One line on what it does and who it's for.">
		{#snippet actions()}
			<Action href="/docs/quick-start">Get started</Action>
			<Action href="/docs/introduction" variant="secondary">Read the docs</Action>
		{/snippet}
	</Hero>

	<FeatureGrid background="muted" title="Everything a docs site needs">
		<Feature title="Markdown routes">Add a file, get a page.</Feature>
		<Feature title="Search included">A command palette with no service to run.</Feature>
		<Feature title="Light and dark">Eleven presets ship built in.</Feature>
	</FeatureGrid>

	<CTA title="Start writing" description="Your first page is a markdown file.">
		{#snippet actions()}
			<Action href="/docs/quick-start">Quick start</Action>
		{/snippet}
	</CTA>
</DocsShell>
```

`npm create svelte-docsmith` scaffolds a landing page built from these, so the
fastest way to see them running is to start a project and edit the result.

## Hero

The opening section. Give it a `media` snippet and it becomes a two-column
split, with your headline on the left and a code sample, screenshot, or live
component on the right. Leave `media` off and the hero centres on a single
column instead, which suits a project that leads with a sentence rather than a
screenshot.

`title` and `description` each take a plain string or a snippet. Reach for the
snippet form when you want to mark part of the headline up, such as colouring
one word with `text-primary`.

<PropsTable title="Hero">
	<Prop name="title" type="string | Snippet" required>
		The headline. Pass a snippet to mark part of it up.
	</Prop>
	<Prop name="description" type="string | Snippet">
		Supporting paragraph below the headline.
	</Prop>
	<Prop name="eyebrow" type="Snippet">
		A pill, badge, or announcement link above the headline.
	</Prop>
	<Prop name="actions" type="Snippet">
		Call-to-action buttons, usually one or two <code>Action</code> links.
	</Prop>
	<Prop name="media" type="Snippet">
		The second column. Without it the hero centres on one column.
	</Prop>
</PropsTable>

## Feature grid

A grid of short capability blurbs. `FeatureGrid` owns the section heading and
the layout; each `Feature` is one cell, with an optional icon rendered in a
tinted square beside the text.

Set `background="muted"` to tint the band and rule it top and bottom. Alternate
it against the sections either side and the page reads as distinct bands rather
than one continuous scroll.

<PropsTable title="FeatureGrid">
	<Prop name="title" type="string">
		Section heading above the grid.
	</Prop>
	<Prop name="description" type="string">
		Supporting line below the heading.
	</Prop>
	<Prop name="columns" type="2 | 3" default="3">
		Columns at the widest breakpoint. The grid steps down to two, then one, on
		narrower screens.
	</Prop>
	<Prop name="background" type="'default' | 'muted'" default="'default'">
		<code>muted</code> tints the band and adds a rule above and below.
	</Prop>
	<Prop name="children" type="Snippet" required>
		The <code>Feature</code> cells.
	</Prop>
</PropsTable>

<PropsTable title="Feature">
	<Prop name="title" type="string" required>
		The cell heading.
	</Prop>
	<Prop name="icon" type="Snippet">
		Optional leading icon, rendered in a tinted square.
	</Prop>
	<Prop name="children" type="Snippet">
		The description.
	</Prop>
</PropsTable>

## CTA

The closing panel: a bordered card with a soft glow behind the heading, so the
page ends on your primary colour instead of trailing off. Anything you pass as
children sits below the actions, which is where a note or a `Callout` about
release status fits.

<PropsTable title="CTA">
	<Prop name="title" type="string" required>
		The closing heading.
	</Prop>
	<Prop name="description" type="string">
		Supporting line below the heading.
	</Prop>
	<Prop name="actions" type="Snippet">
		Call-to-action buttons.
	</Prop>
	<Prop name="children" type="Snippet">
		Content below the actions, such as a note or callout.
	</Prop>
</PropsTable>

## Action

The call-to-action link used by `Hero` and `CTA`. `primary` is the filled
button, `secondary` the outlined one that sits beside it. The primary variant
carries a trailing arrow that nudges on hover; turn it off with `arrow={false}`.

It is deliberately small. Anything more elaborate, such as a button that copies
an install command to the clipboard, is clearer written as your own markup
inside the `actions` snippet.

<PropsTable title="Action">
	<Prop name="href" type="string" required>
		Where the link points.
	</Prop>
	<Prop name="variant" type="'primary' | 'secondary'" default="'primary'">
		Filled or outlined.
	</Prop>
	<Prop name="external" type="boolean" default="false">
		Open in a new tab with <code>rel="noopener noreferrer"</code>.
	</Prop>
	<Prop name="arrow" type="boolean">
		Trailing arrow. Defaults to on for <code>primary</code>, off for <code>secondary</code>.
	</Prop>
	<Prop name="children" type="Snippet" required>
		The link label.
	</Prop>
</PropsTable>
