import { join } from '../utils/url.js';
import { escapeXml } from './xml.js';

/** One entry in a sitemap: a page path (joined to the origin) and optional last-modified date. */
export type SitemapEntry = {
	/**
	 * Page path, e.g. `/docs/intro`. Joined to the origin with exactly one slash
	 * between, so the leading slash is optional.
	 */
	path: string;
	/** Last-modified date; an ISO string or `YYYY-MM-DD`. Only the date is emitted. */
	lastmod?: string;
};

/**
 * Build a sitemap.xml body from a list of pages. Served by `sitemap()` in
 * `svelte-docsmith/server`, which decides the pages.
 */
export function generateSitemap(origin: string, entries: SitemapEntry[]): string {
	const urls = entries
		.map(({ path, lastmod }) => {
			const loc = `\t\t<loc>${escapeXml(join(origin, path))}</loc>`;
			const mod = lastmod ? `\n\t\t<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
			return `\t<url>\n${loc}${mod}\n\t</url>`;
		})
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
