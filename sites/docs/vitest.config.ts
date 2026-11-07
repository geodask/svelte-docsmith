import { defineConfig } from 'vitest/config';

// Unit tests for the docs site's own logic (the theme builder core). Kept out
// of vite.config.ts so they run without the SvelteKit and docsmith() plugins.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
