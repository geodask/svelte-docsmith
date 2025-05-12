# Features Layer

## Purpose

The Features layer contains user interactions and business logic. Features implement specific user scenarios by combining entities and other shared resources.

## What belongs here?

- User interactions and forms
- Feature-specific business logic
- Complex state management
- Feature-specific components
- Implementations of use cases

## What doesn't belong here?

- Reusable business entities (these go in Entities)
- Complex UI compositions (these go in Widgets)
- Generic components with no business logic (these go in Shared/UI)

## Structure

```
features/
├── feature-name/          # A specific feature
│   ├── ui/                # Feature-specific UI components
│   ├── config/            # Feature configuration (feature flags etc)
│   ├── model/             # Feature data models and types
│   ├── api/               # Feature-specific API methods
│   └── index.ts           # Public API exports
└── README.md              # This file
```

## Usage Example

```svelte
<script>
	// Import through the public API
	import { LoginForm, type LoginData } from '$lib/features/auth';
</script>

<LoginForm />
```
