# SvelteKit Shadcn FSD Template

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Shadcn-Svelte](https://img.shields.io/badge/Shadcn_Svelte-000000?style=for-the-badge&logo=shadcnui&logoColor=FF3E00)](https://www.shadcn-svelte.com/)
[![FSD](https://img.shields.io/badge/Feature_Sliced_Design-FF1E2D?style=for-the-badge&logo=slice&logoColor=white)](https://feature-sliced.github.io/documentation/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A template for quickly bootstrapping SvelteKit projects with Shadcn UI components and Feature-Sliced Design (FSD) architecture.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Dependency Diagram](#dependency-diagram)
- [Getting Started](#getting-started)
- [Adding New FSD Slices](#adding-new-fsd-slices)
- [Shadcn UI for Svelte](#shadcn-ui-for-svelte)
- [Feature-Sliced Design (FSD)](#feature-sliced-design-fsd)
  - [Layer Dependencies](#layer-dependencies)
  - [FSD Layers in this Template](#fsd-layers-in-this-template)
- [SvelteKit Integration](#sveltekit-integration)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Overview

This template provides a pre-configured SvelteKit project that combines:

- SvelteKit as the framework
- Shadcn UI components for Svelte
- Feature-Sliced Design (FSD) architecture for project structure

## Project Structure

The project follows a modified Feature-Sliced Design architecture with layers organized under `src/lib`:

```
src/
├── lib/
│   ├── entities/           # Business entities (users, products, etc.)
│   ├── features/           # User interactions and business logic
│   ├── pages/              # Page components
│   ├── shared/             # Shared utilities, UI components, and APIs
│   │   ├── lib/            # Utility functions and hooks
│   │   │   └── shadcn.ts   # Shadcn utilities
│   │   └── ui/             # Shadcn UI components and custom reusable components with no business logic
│   └── widgets/            # Complex UI blocks composed of entities and features
├── routes/                 # SvelteKit routes (maps to FSD "app" layer)
└── app.css                 # Global styles
```

## Dependency Diagram

```
┌────────────┐
│   routes   │ (SvelteKit routes - FSD "app" layer)
└─────┬──────┘
      │
      ▼
┌────────────┐
│   pages    │ Page components
└─────┬──────┘
      │
      ▼
┌────────────┐
│  widgets   │ Complex UI blocks
└─────┬──────┘
      │
      ▼
┌────────────┐
│  features  │ User interactions and business logic
└─────┬──────┘
      │
      ▼
┌────────────┐
│  entities  │ Business entities
└─────┬──────┘
      │
      ▼
┌────────────┐
│   shared   │ Reusable utilities and components
└────────────┘
```

Each layer can import from any layer below it, but only through the public API (index.ts).

## Getting Started

1. Clone this repository

   ```bash
   git clone https://github.com/yourusername/sveltekit-shadcn-fsd-template.git my-project
   cd my-project
   ```

2. Install dependencies with `pnpm install`
3. Run the development server with `pnpm dev`
4. Build for production with `pnpm build`

## Adding New FSD Slices

Here's a quick example of how to add a new slice following the FSD structure:

### Example: Adding Authentication Functionality

1. **Create the feature slice structure**:

   ```
   src/lib/features/auth/
   ├── ui/
   │   ├── login-form.svelte
   │   └── register-form.svelte
   ├── model/
   │   └── types.ts
   ├── api/
   │   └── api.ts
   └── index.ts
   ```

2. **Create public API in index.ts**:

   ```typescript
   // src/lib/features/auth/index.ts
   export { default as LoginForm } from './ui/login-form.svelte';
   export { default as RegisterForm } from './ui/register-form.svelte';
   export type { LoginData, RegisterData } from './model/types';
   ```

3. **Use in a page slice**:

   ```svelte
   <!-- src/lib/pages/login/ui/page.svelte -->
   <script>
   	import { LoginForm } from '$lib/features/auth';
   </script>

   <div class="container">
   	<h1>Login</h1>
   	<LoginForm />
   </div>
   ```

## Shadcn UI for Svelte

The template uses [Shadcn UI for Svelte](https://www.shadcn-svelte.com/), a collection of beautifully designed, accessible UI components built with Tailwind CSS. These components are not a component library, but rather a collection of reusable components you can copy and paste into your projects.

Shadcn configuration:

- **Style**: "New York" theme
- **Base Color**: Neutral
- **Components location**: `$lib/shared/ui/`
- **Utilities location**: `$lib/shared/lib/shadcn.ts`

> **Note:** This template uses `shadcn-svelte@next` with Tailwind CSS v3. It will be updated when the stable version of shadcn-svelte is released.

## Feature-Sliced Design (FSD)

[Feature-Sliced Design](https://feature-sliced.github.io/documentation/) is a methodology for organizing code in frontend applications. This template implements FSD with a slight adaptation to work well with SvelteKit.

### Layer Dependencies

The project follows strict layer boundaries:

- Each layer can only import from layers below it
- Layers must only use the public API (index.ts) from layers below, never reference their internal structure
- Segments within the same layer cannot import from each other
- The dependency flow follows: `pages -> widgets -> features -> entities -> shared`

Example of correct imports:

```ts
// ✅ Correct: Using public API
import { UserCard } from '$lib/entities/user';

// ❌ Wrong: Using internal structure
import { UserCard } from '$lib/entities/user/ui/user-card';

// ❌ Wrong: Cross-segment import within same layer
import { AdminCard } from '$lib/entities/admin'; // from user/index.ts inside $lib/entities/user
```

For more detailed information about FSD principles and guidelines, refer to the [official documentation](https://feature-sliced.github.io/documentation/docs/reference).

### FSD Layers in this Template

- **app**: Maps to `routes` folder - application initialization, routing, and global providers
- **pages**: Page components
- **widgets**: Complex UI blocks composed of features and entities
- **features**: User interactions and business logic
- **entities**: Business logic related to domain entities
- **shared**: Reusable components, utilities, and APIs

## SvelteKit Integration

This template integrates FSD with SvelteKit in the following ways:

- The FSD "app" layer maps to SvelteKit's `routes` directory
- Page components in `$lib/pages` are imported and used in SvelteKit routes
- SvelteKit layouts (`+layout.svelte`) handle global layouts and data loading
- Page-specific layouts can be created in the `routes` directory

Example:

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script>
	import { DashboardPage } from '$lib/pages/dashboard';
</script>

<DashboardPage />
```

## Configuration

The template includes:

- TypeScript support
- Shadcn UI configuration
- ESLint and Prettier configuration
- Alias paths for easy imports between FSD layers

## Contributing

This is primarily a personal template that reflects my development workflow. However, contributions and suggestions are welcome if you'd like to help improve it!

## License

MIT
