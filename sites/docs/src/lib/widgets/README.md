# Widgets Layer

## Purpose

The Widgets layer contains complex UI blocks that combine features and entities. Widgets are larger and more complex than individual components, but smaller than entire pages.

## What belongs here?

- Complex UI compositions
- Composite blocks that use multiple features or entities
- Reusable sections of pages (e.g., dashboards, sidebars)
- Components that orchestrate multiple features

## What doesn't belong here?

- Simple UI components (these go in Shared/UI)
- Business entities (these go in Entities)
- User interactions (these go in Features)
- Entire pages (these go in Pages)

## Structure

```
widgets/
├── widget-name/           # A specific widget
│   ├── ui/                # Widget UI components
│   ├── lib/               # Widget-specific utilities
│   └── index.ts           # Public API exports
└── README.md              # This file
```

## Usage Example

```svelte
<script>
	// Import through the public API
	import { UserDashboard } from '$lib/widgets/dashboard';
</script>
```
