---
title: File Tree
description: Show project and directory structure as a tree.
section: Components
order: 16
---

<script>
	import { FileTree, FileTreeItem, PropsTable } from 'svelte-docsmith';
	import fileTreeItemProps from '$docsmith/components/docs/file-tree-item.svelte?props';
	import fileTreeProps from '$docsmith/components/docs/file-tree.svelte?props';
</script>

Sketch a folder layout so the reader sees where a file goes. Indentation and
folder icons carry the structure, no ASCII art to keep aligned by hand.

<FileTree>
	<FileTreeItem name="src" folder>
		<FileTreeItem name="routes">
			<FileTreeItem name="docs">
				<FileTreeItem name="+layout.svelte" />
				<FileTreeItem name="introduction/+page.md" highlight />
			</FileTreeItem>
		</FileTreeItem>
		<FileTreeItem name="app.css" />
	</FileTreeItem>
	<FileTreeItem name="vite.config.ts" />
	<FileTreeItem name="package.json" />
</FileTree>

## Usage

Nest `FileTreeItem`s to nest directories; an item with children is a folder
automatically. Pass `folder` to style an empty directory, and `highlight` to
call out the entry a guide is about to touch.

<!-- prettier-ignore -->
```svelte
<script>
	import { FileTree, FileTreeItem } from 'svelte-docsmith';
</script>

<FileTree>
	<FileTreeItem name="src" folder>
		<FileTreeItem name="app.css" highlight />
	</FileTreeItem>
	<FileTreeItem name="package.json" />
</FileTree>
```

## API reference

### FileTree

<PropsTable of={fileTreeProps} />

### FileTreeItem

<PropsTable of={fileTreeItemProps} />
