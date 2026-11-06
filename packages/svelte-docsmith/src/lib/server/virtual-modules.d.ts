// The generated modules `./index.ts` reads, as the `docsmith()` Vite plugin
// serves them. Declared here because the package's own exports point these
// specifiers at `dist/fallbacks/*`, which doesn't exist until a build.

declare module 'svelte-docsmith/content' {
	export const content: import('../core/content.js').DocsContent;
}

declare module 'svelte-docsmith/llms' {
	export const docs: import('../core/content.js').LlmsDoc[];
}

declare module 'svelte-docsmith/search' {
	export const docs: import('../core/content.js').SearchDoc[];
}

declare module 'svelte-docsmith/changelog' {
	export const releases: import('../core/changelog.js').ChangelogRelease[];
	export const changelogPath: string;
}
