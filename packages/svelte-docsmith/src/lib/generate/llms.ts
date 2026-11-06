import type { LlmsDoc } from '#lib/core/content.js';
import { readingSections, readingSequence } from '#lib/core/reading-order.js';
import { mcpUrl } from '#lib/mcp/connect.js';
import { join } from '../utils/url.js';

/** Site-level info for the LLM files: title, optional description, and origin. */
export type LlmsSite = {
	title: string;
	description?: string;
	/**
	 * Absolute origin, e.g. `https://my-docs.dev`, used to make links absolute.
	 * Without it the links stay site-relative.
	 */
	origin?: string;
	/**
	 * The site's MCP server: its path, such as `/mcp`, or an absolute URL. When
	 * set, llms.txt tells agents where to connect.
	 *
	 * @experimental Outside the 1.0 stability promise. May change in a minor.
	 */
	mcp?: string;
};

/**
 * Build an [llms.txt](https://llmstxt.org) index: the site title and
 * description, then a sectioned list of links to each page. Served by
 * `llmsTxt()` in `svelte-docsmith/server`, which scopes it to the current
 * version.
 */
export function generateLlmsTxt(site: LlmsSite, docs: LlmsDoc[]): string {
	const origin = site.origin ?? '';
	const out: string[] = [`# ${site.title}`];
	if (site.description) out.push('', `> ${site.description}`);
	if (site.mcp) out.push('', `MCP server: ${mcpUrl(site.mcp, origin)}`);

	for (const [section, items] of readingSections(docs)) {
		out.push('', `## ${section}`, '');
		for (const doc of items) {
			const suffix = doc.description ? `: ${doc.description}` : '';
			out.push(`- [${doc.title}](${join(origin, doc.path)})${suffix}`);
		}
	}
	return out.join('\n') + '\n';
}

/**
 * Build `llms-full.txt`: the site header followed by the full markdown of every
 * page, so an LLM can ingest the entire documentation in one request. Served by
 * `llmsFullTxt()` in `svelte-docsmith/server`.
 */
export function generateLlmsFullTxt(site: LlmsSite, docs: LlmsDoc[]): string {
	const header = site.description ? `# ${site.title}\n\n> ${site.description}` : `# ${site.title}`;
	const ordered = readingSequence(docs);
	return [header, ...ordered.map((doc) => doc.content.trim())].join('\n\n') + '\n';
}
