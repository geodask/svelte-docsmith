// The generated modules, as the `docsmith()` Vite plugin serves them. Declared
// here because the package's own exports point these specifiers at
// `dist/fallbacks/*`, which doesn't exist until a build. Each fallback is the
// one declaration of its module's exports, so these only point at them.

declare module 'svelte-docsmith/content' {
	export * from '#lib/fallbacks/content.js';
}

declare module 'svelte-docsmith/llms' {
	export * from '#lib/fallbacks/llms.js';
}

declare module 'svelte-docsmith/search' {
	export * from '#lib/fallbacks/search.js';
}

declare module 'svelte-docsmith/changelog' {
	export * from '#lib/fallbacks/changelog.js';
}

declare module 'svelte-docsmith/site' {
	export * from '#lib/fallbacks/site.js';
}

declare module 'svelte-docsmith/reader-events' {
	export * from '#lib/fallbacks/reader-events.js';
}
