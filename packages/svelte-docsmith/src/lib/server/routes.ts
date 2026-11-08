/**
 * The route handlers behind `svelte-docsmith/server`, over indexes passed in.
 * `./index.ts` binds them to the generated modules for a real site; tests pass
 * a literal site and indexes. Either way, the current-version policy, the site details and
 * the response headers are decided here, once, rather than in every route.
 */
import type { DocsContent, LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ChangelogRelease } from '#lib/core/changelog.js';
import type { DocsmithSite } from '#lib/core/config.js';
import { currentOnly } from '#lib/core/version.js';
import { generateFeed } from '#lib/generate/feed.js';
import { generateLlmsFullTxt, generateLlmsTxt, type LlmsSite } from '#lib/generate/llms.js';
import { generateSitemap, type SitemapEntry } from '#lib/generate/sitemap.js';
import { mcpHandler } from '#lib/mcp/handler.js';
import { ogCard } from './og/card.js';
import { DEFAULT_OG_COLOURS, type OgColours } from './og/colours.js';
import { renderOgImage } from './og/render.js';

/** The site config and generated indexes the handlers answer from. */
export type SiteIndexes = {
	/** `svelte-docsmith/site`'s `site`: the parts of the config the handlers read. */
	site: RouteSite;
	/** `svelte-docsmith/content`'s `content`. */
	content: DocsContent;
	/** `svelte-docsmith/llms`'s `docs`. */
	llms: LlmsDoc[];
	/** `svelte-docsmith/search`'s `docs`. */
	search: SearchDoc[];
	/** `svelte-docsmith/changelog`'s `releases`. */
	releases: ChangelogRelease[];
	/** `svelte-docsmith/changelog`'s `changelogPath`. */
	changelogPath: string;
	/** `svelte-docsmith/site`'s `ogColours`: the theme colours OG images use. */
	ogColours?: OgColours;
};

/** The parts of the site config the handlers read. */
export type RouteSite = Pick<DocsmithSite, 'title' | 'description' | 'url' | 'mcp'>;

/** Options for {@link RouteHandlers.sitemap}. */
export type SitemapOptions = {
	/**
	 * Pages outside the docs to list too, such as the landing page. Every docs
	 * page of the current version is listed already.
	 */
	extra?: SitemapEntry[];
};

/** A GET handler that ignores the request: what a prerendered file route needs. */
export type FileHandler = () => Response;

function respond(body: string, type: string): Response {
	return new Response(body, { headers: { 'content-type': type } });
}

function llmsSite(site: RouteSite): LlmsSite {
	return { title: site.title, description: site.description, origin: site.url, mcp: site.mcp };
}

/** Build every route handler over one set of indexes. */
export function routeHandlers(indexes: SiteIndexes) {
	const { site, content, llms, search, releases, changelogPath } = indexes;
	const ogColours = indexes.ogColours ?? DEFAULT_OG_COLOURS;
	const current = <T extends { version?: string }>(items: T[]) =>
		currentOnly(items, content.versions);

	return {
		sitemap(options: SitemapOptions = {}): FileHandler {
			return () =>
				respond(
					generateSitemap(site.url ?? '', [
						...(options.extra ?? []),
						...current(content.docs).map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
					]),
					'application/xml'
				);
		},

		changelogFeed(): FileHandler {
			return () =>
				respond(
					generateFeed(releases, {
						url: site.url ?? '',
						title: site.title,
						description: site.description,
						path: changelogPath
					}),
					'application/atom+xml; charset=utf-8'
				);
		},

		llmsTxt(): FileHandler {
			return () =>
				respond(generateLlmsTxt(llmsSite(site), current(llms)), 'text/plain; charset=utf-8');
		},

		llmsFullTxt(): FileHandler {
			return () =>
				respond(generateLlmsFullTxt(llmsSite(site), current(llms)), 'text/plain; charset=utf-8');
		},

		agentMarkdown() {
			// Every version's pages, unlike the indexes above: an archived page's
			// "copy page" menu links to its own `.md` twin.
			const byPath = new Map(llms.map((doc) => [doc.path, doc]));
			return {
				/** Every page, so the twins prerender even when nothing links to them. */
				entries: () => llms.map((doc) => ({ slug: doc.path.replace(/^\//, '') })),
				GET: ({ params }: { params: { slug?: string } }): Response => {
					const doc = byPath.get(`/${params.slug ?? ''}`);
					if (!doc) return new Response('Not found', { status: 404 });
					return respond(doc.content, 'text/markdown; charset=utf-8');
				}
			};
		},

		ogImages() {
			// Every version's pages, like the `.md` twins: an archived page links its
			// own image from its head too.
			const byPath = new Map(content.docs.map((doc) => [doc.path, doc]));
			const archived = new Map(
				content.versions.filter((v) => !v.current).map((v) => [v.id, v.label])
			);
			const host = site.url ? new URL(site.url).host : undefined;
			return {
				/** Every page, so the images prerender: nothing links to them but a meta tag. */
				entries: () => content.docs.map((doc) => ({ slug: doc.path.replace(/^\//, '') })),
				GET: async ({ params }: { params: { slug?: string } }): Promise<Response> => {
					const doc = byPath.get(`/${params.slug ?? ''}`);
					if (!doc) return new Response('Not found', { status: 404 });
					const section = Array.isArray(doc.section) ? doc.section.join(' / ') : doc.section;
					const version = doc.version ? archived.get(doc.version) : undefined;
					const png = await renderOgImage(
						ogCard({
							site: site.title,
							title: doc.title,
							description: doc.description,
							eyebrow: [version, section].filter(Boolean).join(' · ') || undefined,
							host,
							colours: ogColours
						})
					);
					return new Response(png as BodyInit, {
						headers: { 'content-type': 'image/png' }
					});
				}
			};
		},

		mcpServer() {
			const handler = mcpHandler({
				site: { title: site.title, description: site.description, origin: site.url },
				docs: llms,
				search,
				versions: content.versions
			});
			return { GET: handler, POST: handler, OPTIONS: handler };
		}
	};
}

/** The handlers {@link routeHandlers} builds. */
export type RouteHandlers = ReturnType<typeof routeHandlers>;
