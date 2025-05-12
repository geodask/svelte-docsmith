# Entities Layer

## Purpose

The Entities layer contains business entities that represent your domain model. These are reusable components that encapsulate business logic related to a specific domain entity.

## What belongs here?

- Domain models (e.g., User, Product, Order)
- Entity-specific components
- Entity-specific business logic
- Entity-related types/interfaces

## What doesn't belong here?

- User interactions (these go in Features)
- Complex UI compositions (these go in Widgets)
- Reusable UI components with no business logic (these go in Shared/UI)

## Structure

```
entities/
├── entity-name/           # A specific entity
│   ├── ui/                # Entity-specific UI components
│   ├── model/             # Entity data models and types
│   ├── api/               # Entity-specific API methods
│   └── index.ts           # Public API exports
└── README.md              # This file
```

## Usage Example

```svelte
<script>
	// Import through the public API
	import { UserCard, type User } from '$lib/entities/user';
</script>

<UserCard />
```
