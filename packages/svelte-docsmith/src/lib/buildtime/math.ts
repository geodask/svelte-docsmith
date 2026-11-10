/**
 * Math in doc pages, turned on with `docsmith({ markdown: { math: true } })`.
 *
 * `$…$` is an inline formula and `$$…$$` on lines of its own a display formula,
 * read by `remark-math` (version 3, the last one written for the remark parser
 * mdsvex bundles). The rules for a single `$` are Pandoc's: the opening `$`
 * can't be followed by a space, and the closing one can't follow a space or be
 * followed by a digit, so "$5 or $10" stays text. `\$` is a literal dollar.
 *
 * A page is Svelte as well as markdown, and remark reads it before Svelte does,
 * so two rules keep store reads out of formulas: a `$` straight after `{`
 * opens nothing (`{$count}`), and a formula whose braces don't balance is not
 * one (`{$a} and {$b}` would otherwise be the formula `a} and {`). TeX needs
 * balanced braces, so no real formula is turned away.
 *
 * Formulas reach the HTML tree as `remark-math` leaves them, a span or div
 * holding the TeX as text, so `rehype-slug` reads a heading's formula as its
 * text, the same text the table of contents slugs. Then {@link rehypeMath}
 * replaces each with Temml's MathML. The MathML goes in as a string literal
 * under `{@html}`, so the braces and `<` of a formula never reach Svelte as
 * markup or expressions, and the page ships no script and no font CSS: the
 * browser draws MathML itself, in the theme's text colour.
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
import { literal } from './code-block.js';

/** The few hast node fields the step reads; mdsvex brings no hast types. */
type HastNode = {
	type: string;
	tagName?: string;
	value?: string;
	properties?: { className?: string[] };
	children?: HastNode[];
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

/** Whether a formula's `{` and `}` pair up, escaped ones aside. */
function bracesBalance(tex: string): boolean {
	let depth = 0;
	for (let i = 0; i < tex.length; i++) {
		if (tex[i] === '\\') i++;
		else if (tex[i] === '{') depth++;
		else if (tex[i] === '}' && --depth < 0) return false;
	}
	return depth === 0;
}

type Tokenizer = ((eat: Eat, value: string, silent?: boolean) => unknown) & {
	locator: (value: string, fromIndex: number) => number;
};
type Eat = (subvalue: string) => (node: { type: string; value?: string }) => unknown;

/**
 * `remark-math`, with its inline tokenizer kept out of Svelte expressions (see
 * the module comment).
 */
function remarkMathInSvelte(this: { Parser: { prototype: Record<string, unknown> } }) {
	remarkMath.call(this as never);
	const tokenizers = this.Parser.prototype.inlineTokenizers as Record<string, Tokenizer>;
	const original = tokenizers.math;

	const tokenizer = ((eat, value, silent) => {
		let found: { subvalue: string; node: { type: string; value?: string } } | undefined;
		original((subvalue) => (node) => (found = { subvalue, node }), value, false);
		if (!found || (found.node.type === 'inlineMath' && !bracesBalance(found.node.value ?? ''))) {
			return undefined;
		}
		return silent ? true : eat(found.subvalue)(found.node);
	}) as Tokenizer;

	tokenizer.locator = (value, fromIndex) => {
		let at = original.locator(value, fromIndex);
		while (at > 0 && value[at - 1] === '{') at = original.locator(value, at + 1);
		return at;
	};
	tokenizers.math = tokenizer;
}

/** The remark plugin that reads formulas. */
export const remarkMathPlugin = remarkMathInSvelte;

/** The rehype step that writes each formula `remark-math` read as MathML. */
export function rehypeMath(warn: (message: string) => void) {
	return () => async (tree: HastNode, file: { filename?: string }) => {
		const formulas: { node: HastNode; display: boolean }[] = [];
		const visit = (node: HastNode) => {
			const classes = node.properties?.className ?? [];
			if (node.type === 'element' && classes.includes('math')) {
				formulas.push({ node, display: classes.includes('math-display') });
			} else node.children?.forEach(visit);
		};
		visit(tree);
		if (!formulas.length) return;

		const renderer = await (temml ??= loadTemml());
		const where = file.filename ? `${file.filename}: ` : '';
		for (const { node, display } of formulas) {
			const tex = (node.children ?? []).map((child) => child.value ?? '').join('');
			const value = mathMarkup(renderer, tex, display, (message) =>
				warn(`[svelte-docsmith] ${where}${message}`)
			);
			for (const key of Object.keys(node)) delete node[key as keyof HastNode];
			Object.assign(node, { type: 'raw', value });
		}
	};
}
