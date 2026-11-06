/**
 * The route handlers behind `svelte-docsmith/server`, over indexes passed in.
 * `./index.ts` binds them to the generated modules for a real site; tests pass
 * literal indexes. Either way, the current-version policy, the site details and
 * the response headers are decided here, once, rather than in every route.
 */
import type { DocsContent, LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ChangelogRelease } from '#lib/core/changelog.js';
import type { DocsmithConfig } from '#lib/core/config.js';
import { currentOnly } from '#lib/core/version.js';
import { generateFeed } from '#lib/generate/feed.js';
import { generateLlmsFullTxt, generateLlmsTxt, type LlmsSite } from '#lib/generate/llms.js';
import { generateSitemap, type SitemapEntry } from '#lib/generate/sitemap.js';
import { mcpHandler } from '#lib/mcp/handler.js';

/** The generated indexes the handlers answer from. */
export type SiteIndexes = {
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
};

/** The parts of the site config the handlers read. Any `defineConfig` result has them. */
export type RouteSite = Pick<DocsmithConfig, 'title' | 'description' | 'url' | 'mcp'>;

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
	const { content, llms, search, releases, changelogPath } = indexes;
	const current = <T extends { version?: string }>(items: T[]) =>
		currentOnly(items, content.versions);

	return {
		sitemap(site: RouteSite, options: SitemapOptions = {}): FileHandler {
			return () =>
				respond(
					generateSitemap(site.url ?? '', [
						...(options.extra ?? []),
						...current(content.docs).map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
					]),
					'application/xml'
				);
		},

		changelogFeed(site: RouteSite): FileHandler {
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

		llmsTxt(site: RouteSite): FileHandler {
			return () =>
				respond(generateLlmsTxt(llmsSite(site), current(llms)), 'text/plain; charset=utf-8');
		},

		llmsFullTxt(site: RouteSite): FileHandler {
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

		mcpServer(site: RouteSite) {
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
