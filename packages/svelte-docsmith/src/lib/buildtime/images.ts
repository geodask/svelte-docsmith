/**
 * DocSmith's rehype step for markdown images.
 *
 * An image path starting `./` or `../` is a file next to the page. SvelteKit
 * serves a page at its URL, not its folder, so the browser would resolve that
 * path against the URL and miss. Here each one becomes an import of the file,
 * which Vite copies and hashes like any other asset, and the image's `src`
 * becomes the imported URL. A missing file fails the build, naming the page
 * and the path. Paths starting `/` (files in `static/`), full URLs and `src`
 * expressions are left alone.
 *
 * With `figures`, an image that is the only thing in its paragraph is lifted
 * out of it and marked `standalone`, so the layout's `img` component can draw
 * it as a figure with a caption: a `<figure>` can't sit inside a `<p>`. An
 * image within a sentence stays where it is.
 *
 * Runs in Node at build time.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { relativeToCwd } from './paths.js';

/** The few hast node fields the step reads; mdsvex brings no hast types. */
type HastNode = {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
};

/** Prefix of the names the step imports images as. */
const IMPORT_NAME = '__docsmith_image_';

/** An instance `<script>` block: any `<script>` that isn't `module`/`context="module"`. */
const INSTANCE_SCRIPT = /^(\s*<script(?![^>]*\b(?:module|context\s*=))[^>]*>)/;

/** Whether `src` names a file next to the page. */
export function isPageRelative(src: string): boolean {
	return src.startsWith('./') || src.startsWith('../');
}

export function rehypeImages({ figures }: { figures: boolean }) {
	return () => (tree: HastNode, file: { filename?: string }) => {
		const imports: string[] = [];
		const page = file.filename;

		const visit = (node: HastNode) => {
			if (node.type === 'element' && node.tagName === 'img') {
				const properties = (node.properties ??= {});
				const src = properties.src;
				if (typeof src === 'string' && isPageRelative(src) && page) {
					const specifier = src;
					const target = path.resolve(path.dirname(path.resolve(page)), specifier.split(/[?#]/)[0]);
					if (!existsSync(target)) {
						throw new Error(
							`[svelte-docsmith] ${relativeToCwd(path.resolve(page))}: the image ` +
								`\`${specifier}\` is not there (looked for ${relativeToCwd(target)}).`
						);
					}
					const name = `${IMPORT_NAME}${imports.length}`;
					imports.push(`import ${name} from ${JSON.stringify(specifier)};`);
					properties.src = `{${name}}`;
				}
			}
			if (!node.children) return;
			if (figures) node.children = node.children.map(liftStandalone);
			node.children.forEach(visit);
		};
		visit(tree);

		if (imports.length) addImports(tree, imports);
	};
}

/**
 * A paragraph holding one image and nothing but whitespace becomes that image,
 * marked `standalone`. Anything else is returned as it is.
 */
function liftStandalone(node: HastNode): HastNode {
	if (node.type !== 'element' || node.tagName !== 'p' || !node.children) return node;
	const content = node.children.filter((child) => !(child.type === 'text' && !child.value?.trim()));
	const [only] = content;
	if (content.length !== 1 || only.type !== 'element' || only.tagName !== 'img') return node;
	// `{true}` reaches the component as a boolean; a bare attribute would be "".
	(only.properties ??= {}).standalone = '{true}';
	return only;
}

/**
 * Add `imports` to the page's instance `<script>`, or give the page one. mdsvex
 * reads a page's script blocks from raw nodes, wherever the author put them,
 * so the step looks through the whole tree before adding a block of its own:
 * a second instance script would not compile.
 */
function addImports(tree: HastNode, imports: string[]): void {
	const lines = imports.map((line) => `\n\t${line}`).join('');
	const find = (node: HastNode): HastNode | undefined => {
		if (node.type === 'raw' && node.value && INSTANCE_SCRIPT.test(node.value)) return node;
		for (const child of node.children ?? []) {
			const found = find(child);
			if (found) return found;
		}
		return undefined;
	};
	const script = find(tree);
	if (script) {
		script.value = script.value!.replace(INSTANCE_SCRIPT, `$1${lines}`);
		return;
	}
	(tree.children ??= []).unshift({ type: 'raw', value: `<script>${lines}\n</script>\n` });
}
