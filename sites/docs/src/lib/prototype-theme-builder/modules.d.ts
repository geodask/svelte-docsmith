// PROTOTYPE — throwaway. Types for the preview route's imports.
declare module '*.md' {
	const Content: import('svelte').Component;
	export default Content;
}
declare module '$docsmith/*.svelte' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Component: import('svelte').Component<any>;
	export default Component;
}
