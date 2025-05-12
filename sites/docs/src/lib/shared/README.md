# Shared Layer

## Purpose

The Shared layer contains reusable code that can be used by any other layer. It is organized into specific segments, each with a clear responsibility and exposed through a public API.

## Standard Segments

- **ui/** - Reusable UI components with no business logic (e.g., buttons, inputs)
- **api/** - API clients, network utilities, and request handling
- **lib/** - Utility functions and helpers
- **config/** - Application configuration and constants
- **model/** - Shared types, interfaces, and enums

## What belongs here?

- Platform-agnostic components
- Generic utilities and helpers
- Network and API utilities
- Configuration constants
- Common types and interfaces

## What doesn't belong here?

- Business entities (these go in Entities)
- Complex UI blocks (these go in Widgets)
- User interactions (these go in Features)
- Page-specific components (these go in Pages)
- Custom segments not listed above

## Structure

```
shared/
├── ui/                    # UI components
│   └── index.ts          # Public API exports
├── api/                   # API utilities
│   └── index.ts          # Public API exports
├── lib/                   # Utility functions
│   └── index.ts          # Public API exports
├── config/                # Configuration (feature flags etc)
│   └── index.ts          # Public API exports
├── model/                 # Shared types
│   └── index.ts          # Public API exports
└── README.md             # This file
```

## Usage Example

```typescript
// Import through the public API
import { Button } from '$lib/shared/ui';
import { http } from '$lib/shared/api';
import { formatDate } from '$lib/shared/lib';
import { API_URL } from '$lib/shared/config';
import type { User } from '$lib/shared/model';
```

## Requirements

- Each segment must have a public API through index.ts
- No segment should import from another segment within shared
- Keep segments focused on their specific responsibility
- Document exported items in index.ts
- Only use standard segments listed above
