---
title: Kbd
description: Render keyboard keys and shortcuts inline.
section: Components
order: 15
---

<script>
	import { Kbd, PropsTable } from 'svelte-docsmith';
	import kbdProps from '$docsmith/components/docs/kbd.svelte?props';
</script>

Show a key or shortcut the way a keyboard does: a small, raised cap that reads as
_press this_, not as code.

<p class="not-prose">
	Save with <Kbd>⌘</Kbd> <Kbd>S</Kbd>, or open the palette with
	<Kbd>Ctrl</Kbd> <Kbd>K</Kbd>.
</p>

## Usage

Wrap each key in its own `Kbd`; combine several for a chord.

```svelte
<script>
	import { Kbd } from 'svelte-docsmith';
</script>

<p>Press <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> to search.</p>
```

## API reference

<PropsTable of={kbdProps} />
