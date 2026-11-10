/**
 * Math in doc pages, turned on with `docsmith({ markdown: { math: true } })`.
 *
 * `$…$` is an inline formula and `$$…$$` on lines of its own a display formula,
 * read by `remark-math` (version 3, the last one written for the remark parser
 * mdsvex bundles). The rules for a single `$` are Pandoc's: the opening `$`
 * can't be followed by a space, and the closing one can't follow a space or be
 * followed by a digit, so "$5 or $10" stays text. `\$` is a literal dollar.
 *
 * Each formula is written by Temml as MathML at build time, so the page ships
 * no script and no font CSS: the browser draws MathML itself, in the theme's
 * text colour. The MathML goes in as a string literal under `{@html}`, so the
 * braces and `<` of a formula never reach Svelte as markup or expressions.
 *
 * A formula Temml can't read warns and shows its source as code rather than
 * failing the build, like a Twoslash snippet that doesn't typecheck.
 *
 * Temml is an optional peer dependency, loaded on the first formula, so sites
 * that never turn math on install nothing for it.
 *
 * Runs in Node at build time.
 */
import remarkMath from 'remark-math';

/** The few mdast node fields the step reads; mdsvex brings no mdast types. */
type MdastNode = {
	type: string;
	value?: string;
	data?: { hProperties?: { className?: string[] } };
	children?: MdastNode[];
};

type Temml = {
	renderToString(tex: string, options: { displayMode: boolean; throwOnError: boolean }): string;
};

let temml: Promise<Temml> | undefined;

async function loadTemml(): Promise<Temml> {
	try {
		const module = (await import('temml')) as { default?: Temml } & Temml;
		return module.default ?? module;
	} catch {
		throw new Error(
			"[svelte-docsmith] 'markdown.math' requires the optional peer dependency temml. " +
				'Install it with: npm i -D temml'
		);
	}
}

/** A string as a JavaScript literal for a Svelte `{expression}`; see `code-block.ts`. */
function literal(value: string): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** One formula as the Svelte markup a page embeds. */
export function mathMarkup(
	renderer: Temml,
	tex: string,
	display: boolean,
	warn: (message: string) => void
): string {
	let html: string;
	try {
		html = renderer.renderToString(tex, { displayMode: display, throwOnError: true });
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		warn(`could not read the formula \`${tex}\`: ${reason}`);
		html = `<code class="docsmith-math-error">${escapeHtml(tex)}</code>`;
	}
	const markup = `{@html ${literal(html)}}`;
	return display ? `<div class="docsmith-math-display">${markup}</div>` : markup;
}

/**
 * The remark plugins that read and write math: `remark-math`'s tokenizers, then
 * a step that replaces each formula node with its markup.
 */
export function remarkMathPlugins(warn: (message: string) => void) {
	function writeMath() {
		return async (tree: MdastNode, file: { filename?: string }) => {
			const formulas: MdastNode[] = [];
			const visit = (node: MdastNode) => {
				if (node.type === 'math' || node.type === 'inlineMath') formulas.push(node);
				else node.children?.forEach(visit);
			};
			visit(tree);
			if (!formulas.length) return;

			const renderer = await (temml ??= loadTemml());
			const where = file.filename ? `${file.filename}: ` : '';
			for (const node of formulas) {
				// `$$…$$` inside a sentence is inline in the tree but asks for display.
				const display =
					node.type === 'math' ||
					(node.data?.hProperties?.className?.includes('math-display') ?? false);
				const value = mathMarkup(renderer, node.value ?? '', display, (message) =>
					warn(`[svelte-docsmith] ${where}${message}`)
				);
				node.type = 'html';
				node.value = value;
				delete node.data;
				delete node.children;
			}
		};
	}
	return [remarkMath, writeMath];
}
