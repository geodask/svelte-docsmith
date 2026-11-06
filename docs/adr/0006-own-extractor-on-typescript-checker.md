# Generated props tables use our own extractor on the TypeScript checker

Generated props tables must show resolved types (an imported `BadgeVariant` alias appears as its `'default' | 'primary' | …` union), which only the TypeScript checker can produce. We therefore build our own extractor on svelte2tsx plus the TypeScript checker, the same route svelte-check takes, and load TypeScript as an optional peer dependency only when a page asks for a generated props table, as Twoslash already does.

## Considered Options

- **sveld**: actively maintained and parses runes, but it never loads TypeScript, so aliases imported from another file show as written. Rejected because resolved types are the point.
- **svelte-docgen**: uses the checker, but sat at 0.1.0 with no release since December 2024. Rejected as too risky a foundation.

## Consequences

- TypeScript is required to build a site that uses generated props tables; sites that don't use them pay nothing.
- Builds pay for a TypeScript program. The extractor has to cache and reuse it rather than create one per table.
