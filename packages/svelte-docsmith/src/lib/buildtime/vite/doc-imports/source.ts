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
		// Unlike agent markdown, which keeps the tag, the page can't render
		// without it: let the read fail the import with its own error.
		const code = exampleSource(file);
		// The same renderer as a markdown fence, so the panel matches one.
		const html = sourcePanelHtml(await render(code, 'svelte'));
		return `export default ${JSON.stringify(html)};`;
	},

	async read(file) {
		try {
			return exampleSource(file);
		} catch {
			return undefined;
		}
	},

	tag: 'LiveExample',
	attribute: 'source',

	write(code, { indent }) {
		const fence = fenceFor(code, 3);
		return indented([fence + 'svelte', code, fence].join('\n'), indent);
	}
};

/** The example as both sides show it: the file as written, trailing whitespace trimmed. */
function exampleSource(file: string): string {
	return fs.readFileSync(file, 'utf-8').trimEnd();
}
