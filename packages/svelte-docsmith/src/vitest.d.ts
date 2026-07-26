// Registers the @testing-library/jest-dom matcher types (toBeInTheDocument,
// toBeVisible, toHaveClass, …) onto vitest's `expect` for type-checking. The
// runtime augmentation is applied by vitest-setup-client.ts; this makes svelte
// -check see it too. Outside src/lib, so it is never published.
import '@testing-library/jest-dom/vitest';
