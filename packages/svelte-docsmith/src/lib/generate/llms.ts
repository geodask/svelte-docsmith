import type { LlmsDoc } from '$lib/core/content.js';

/** Site-level info for the LLM files: title, optional description, and origin. */
export type LlmsSite = {
	title: string;
	description?: string;
	/** Absolute origin, e.g. `https://my-docs.dev`, used to make links absolute. */
	origin?: string;
};

/**
 * Group docs by section and put both the sections and the docs within them in
 * sidebar reading order: items by their `order`, sections by the smallest
 * `order` they contain. Mirrors `navFromContent` so the LLM index matches the
 * on-page navigation instead of falling back to path-alphabetical order.
 */
function bySection(docs: LlmsDoc[]): Array<[string, LlmsDoc[]]> {
	const groups = new Map<string, { minOrder: number; items: LlmsDoc[] }>();
	for (const doc of docs) {
		const section = doc.section ?? 'Docs';
		const order = doc.order ?? 0;
		const group = groups.get(section) ?? { minOrder: Infinity, items: [] };
		group.items.push(doc);
		group.minOrder = Math.min(group.minOrder, order);
		groups.set(section, group);
	}
	return [...groups.entries()]
		.sort((a, b) => a[1].minOrder - b[1].minOrder)
		.map(([section, group]): [string, LlmsDoc[]] => [
			section,
			group.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		]);
}

/**
 * Build an [llms.txt](https://llmstxt.org) index: the site title and
 * description, then a sectioned list of links to each page. Wire it into a
 * `src/routes/llms.txt/+server.ts` over the `svelte-docsmith/llms` module.
 *
 * ```ts
 * import { docs } from 'svelte-docsmith/llms';
 * import { generateLlmsTxt } from 'svelte-docsmith';
 *
 * export const prerender = true;
 * export function GET() {
 *   const body = generateLlmsTxt({ title: 'My Docs', origin: 'https://my-docs.dev' }, docs);
 *   return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
 * }
 * ```
 */
export function generateLlmsTxt(site: LlmsSite, docs: LlmsDoc[]): string {
	const base = (site.origin ?? '').replace(/\/$/, '');
	const out: string[] = [`# ${site.title}`];
	if (site.description) out.push('', `> ${site.description}`);

	for (const [section, items] of bySection(docs)) {
		out.push('', `## ${section}`, '');
		for (const doc of items) {
			const suffix = doc.description ? `: ${doc.description}` : '';
			out.push(`- [${doc.title}](${base}${doc.path})${suffix}`);
		}
	}
	return out.join('\n') + '\n';
}

/**
 * Build `llms-full.txt`: the site header followed by the full markdown of every
 * page, so an LLM can ingest the entire documentation in one request. Same
 * wiring as {@link generateLlmsTxt}, at `src/routes/llms-full.txt/+server.ts`.
 */
export function generateLlmsFullTxt(site: LlmsSite, docs: LlmsDoc[]): string {
	const header = site.description ? `# ${site.title}\n\n> ${site.description}` : `# ${site.title}`;
	const ordered = bySection(docs).flatMap(([, items]) => items);
	return [header, ...ordered.map((doc) => doc.content.trim())].join('\n\n') + '\n';
}
