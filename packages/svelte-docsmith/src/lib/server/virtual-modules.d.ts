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

declare module 'svelte-docsmith/site' {
	export const site: import('../core/config.js').DocsmithSite;
	export const outside: string[];
	export const githubStars: number | undefined;
	export const ogColours: import('./og/colours.js').OgColours;
}

declare module 'svelte-docsmith/reader-events' {
	export const handler: import('../core/reader-events.js').ReaderEventHandler | undefined;
}
