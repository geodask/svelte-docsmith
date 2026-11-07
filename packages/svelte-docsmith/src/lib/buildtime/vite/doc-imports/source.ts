/**
 * The `?source` doc import. On the page, `Example.svelte?source` loads as the
 * file's highlighted source for `<LiveExample source={…}>`, drawn by the same
 * code block renderer as a markdown fence. In agent markdown, the tag becomes
 * a fenced `svelte` block of the same source.
 */
import fs from 'node:fs';
import { sourcePanelHtml } from '../../code-block.js';
import type { DocImportKind } from './index.js';
import { fenceFor, indented } from './markdown.js';

export const sourceImport: DocImportKind<'source'> = {
	query: 'source',

	async module(file, hook, { render }) {
		hook.addWatchFile(file);
		const code = readExampleSource(file);
		if (code === undefined) throw new Error(`[svelte-docsmith] could not read ${file}`);
		// The same renderer as a markdown fence, so the panel matches one.
		const html = sourcePanelHtml(await render(code, 'svelte'));
		return `export default ${JSON.stringify(html)};`;
	},

	async read(file) {
		return readExampleSource(file);
	},

	tag: 'LiveExample',
	attribute: 'source',

	write(code, { indent }) {
		const fence = fenceFor(code, 3);
		return indented([fence + 'svelte', code, fence].join('\n'), indent);
	}
};

/**
 * The example as both sides show it: the file as written, trailing whitespace
 * trimmed; `undefined` when it can't be read.
 */
function readExampleSource(file: string): string | undefined {
	try {
		return fs.readFileSync(file, 'utf-8').trimEnd();
	} catch {
		return undefined;
	}
}
