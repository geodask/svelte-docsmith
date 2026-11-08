// Types for the theme preview's imports. A markdown file compiles to a
// component (docsmith()'s markdown plugin), and `$docsmith` is the vite alias
// to the package source (see vite.config.ts) for shell pieces that aren't
// public exports.
declare module '*.md' {
	const Content: import('svelte').Component;
	export default Content;
}
declare module '$docsmith/*.svelte' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Component: import('svelte').Component<any>;
	export default Component;
}
