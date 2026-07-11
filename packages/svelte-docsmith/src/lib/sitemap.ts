/** One entry in a sitemap: a page path (joined to the origin) and optional last-modified date. */
export type SitemapEntry = {
	/** Absolute path, e.g. `/docs/intro`. Joined to the origin. */
	path: string;
	/** Last-modified date; an ISO string or `YYYY-MM-DD`. Only the date is emitted. */
	lastmod?: string;
};

const escapeXml = (s: string) =>
	s.replace(/[&<>'"]/g, (c) => {
		switch (c) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case "'":
				return '&apos;';
			default:
				return '&quot;';
		}
	});

/**
 * Build a sitemap.xml body from a list of pages. Framework-agnostic: wire it
 * into a SvelteKit `src/routes/sitemap.xml/+server.ts` that maps the generated
 * `svelte-docsmith/content` index (plus any non-doc routes) into entries.
 *
 * ```ts
 * import { docs } from 'svelte-docsmith/content';
 * import { generateSitemap } from 'svelte-docsmith';
 *
 * export const prerender = true;
 * export function GET() {
 *   const body = generateSitemap('https://my-docs.dev', [
 *     { path: '/' },
 *     ...docs.map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
 *   ]);
 *   return new Response(body, { headers: { 'content-type': 'application/xml' } });
 * }
 * ```
 */
export function generateSitemap(origin: string, entries: SitemapEntry[]): string {
	const base = origin.replace(/\/$/, '');
	const urls = entries
		.map(({ path, lastmod }) => {
			const loc = `\t\t<loc>${escapeXml(base + path)}</loc>`;
			const mod = lastmod ? `\n\t\t<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
			return `\t<url>\n${loc}${mod}\n\t</url>`;
		})
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
