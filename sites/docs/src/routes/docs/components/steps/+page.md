---
title: Steps
description: A numbered walkthrough for sequential instructions.
section: Components
order: 10
---

<script>
	import { Steps, Step, PropsTable, Prop } from 'svelte-docsmith';
</script>

## Steps

A numbered walkthrough — a connecting line with numbered badges — for setup flows
where the order matters. Each step is a `<Step>`; the numbers are automatic.

<Steps>
	<Step title="Install the package">

Add `svelte-docsmith` to your SvelteKit project.

    </Step>
    <Step title="Register the pipeline">

Add `docsmith()` in `svelte.config.js` and `vite.config.ts`.

    </Step>
    <Step title="Write a page">

Drop a `+page.md` under `src/routes/docs/` and it appears in the sidebar.

    </Step>

</Steps>

## Usage

`Steps` and `Step` are plain components — they work in a markdown page **and** in
any `.svelte` file, with no preprocessor required. Give each `Step` an optional
`title`; leave blank lines around markdown content so it's parsed.

<!-- prettier-ignore -->
```svelte
<script>
	import { Steps, Step } from 'svelte-docsmith';
</script>

<Steps>
	<Step title="First">Do this.</Step>
	<Step title="Then">Do that.</Step>
</Steps>
```

### Markdown shortcut

Inside a markdown page only, you can skip the `<Step>` tags and use a plain
ordered list — mdsvex turns it into steps:

<!-- prettier-ignore -->
```md
<Steps>

1. Do this.
2. Do that.

</Steps>
```

## Props

<PropsTable title="Step">
	<Prop name="title" type="string">
		Optional heading for the step.
	</Prop>
</PropsTable>
