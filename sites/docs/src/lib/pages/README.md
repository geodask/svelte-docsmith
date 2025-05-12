# Pages Layer

## Purpose

The Pages layer contains page components. Pages combine widgets, features, and entities to create complete application views.

## What belongs here?

- Page components that represent routes
- Page-specific composition logic
- Meta information (title, description, etc.)

## What doesn't belong here?

- Reusable UI components (these go in Shared/UI)
- Business entities (these go in Entities)
- User interactions (these go in Features)
- Complex UI blocks (these go in Widgets)

## Structure

```
pages/
├── page-name/             # A specific page
│   ├── ui/                # Page UI components
│   ├── config/            # Page configuration (feature flags etc)
│   ├── api/               # Page-specific API methods
│   └── index.ts           # Public API exports
└── README.md              # This file
```

## Usage Example

```svelte
<script>
	// Import through the public API
	import { DashboardPage } from '$lib/pages/dashboard';
</script>
```
