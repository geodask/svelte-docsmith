import { describe, expect, it } from 'vitest';
import type { DocsContentItem, LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ResolvedVersion } from '#lib/core/version.js';
import { routeHandlers, type SiteIndexes } from './routes.js';

const versions: ResolvedVersion[] = [
	{
		id: 'v2',
		label: 'v2.x',
		basePath: '/docs',
		landing: '/docs/intro',
		current: true,
		noindex: false
	},
	{
		id: 'v1',
		label: 'v1.x',
		basePath: '/docs/v1',
		landing: '/docs/v1/intro',
		current: false,
		noindex: true
	}
];

const docs: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', lastUpdated: '2026-10-01', version: 'v2' },
	{ title: 'Old intro', path: '/docs/v1/intro', version: 'v1' }
];

const llms: LlmsDoc[] = [
	{ title: 'Intro', path: '/docs/intro', content: '# Intro\n\nCurrent.', version: 'v2' },
	{ title: 'Old intro', path: '/docs/v1/intro', content: '# Old intro\n\nArchived.', version: 'v1' }
];

const search: SearchDoc[] = llms.map((d) => ({
	path: d.path,
	title: d.title,
	headings: [],
	text: d.content,
	version: d.version
}));

const site = {
	title: 'My Docs',
	description: 'Docs for a thing',
	url: 'https://x.dev',
	mcp: '/mcp'
};

const indexes: SiteIndexes = {
	site,
	content: { docs, versions },
	llms,
	search,
	releases: [{ version: '2.0.0', date: '2026-10-01T00:00:00.000Z', groups: [] }],
	changelogPath: '/releases'
};

const handlers = routeHandlers(indexes);

async function read(response: Response) {
	return { type: response.headers.get('content-type'), body: await response.text() };
}

describe('sitemap', () => {
	it('lists the extra pages and every current docs page, never an archived one', async () => {
		const { type, body } = await read(handlers.sitemap({ extra: [{ path: '/' }] })());
		expect(type).toBe('application/xml');
		expect(body).toContain('<loc>https://x.dev/</loc>');
		expect(body).toContain('<loc>https://x.dev/docs/intro</loc>');
		expect(body).toContain('<lastmod>2026-10-01</lastmod>');
		expect(body).not.toContain('/docs/v1/');
	});

	it('keeps links site-relative when the site has no url', async () => {
		const bare = routeHandlers({ ...indexes, site: { title: 'T' } });
		const { body } = await read(bare.sitemap()());
		expect(body).toContain('<loc>/docs/intro</loc>');
	});
});

describe('changelogFeed', () => {
	it('links to the changelog at the path the plugin dated releases against', async () => {
		const { type, body } = await read(handlers.changelogFeed()());
		expect(type).toBe('application/atom+xml; charset=utf-8');
		expect(body).toContain('<link href="https://x.dev/releases" />');
		expect(body).toContain('https://x.dev/releases#2.0.0');
		expect(body).toContain('<subtitle>Docs for a thing</subtitle>');
	});
});

describe('llmsTxt and llmsFullTxt', () => {
	it('index the current version only and point agents at the MCP server', async () => {
		const { type, body } = await read(handlers.llmsTxt()());
		expect(type).toBe('text/plain; charset=utf-8');
		expect(body).toContain('# My Docs');
		expect(body).toContain('MCP server: https://x.dev/mcp');
		expect(body).toContain('[Intro](https://x.dev/docs/intro)');
		expect(body).not.toContain('Old intro');
	});

	it('write the full text of current pages only', async () => {
		const { body } = await read(handlers.llmsFullTxt()());
		expect(body).toContain('Current.');
		expect(body).not.toContain('Archived.');
	});
});

describe('agentMarkdown', () => {
	const { GET, entries } = handlers.agentMarkdown();

	it('lists every page of every version as a prerender entry', () => {
		expect(entries()).toEqual([{ slug: 'docs/intro' }, { slug: 'docs/v1/intro' }]);
	});

	it('serves a page, archived ones included, as markdown', async () => {
		const { type, body } = await read(GET({ params: { slug: 'docs/v1/intro' } }));
		expect(type).toBe('text/markdown; charset=utf-8');
		expect(body).toBe('# Old intro\n\nArchived.');
	});

	it('answers 404 for a path that is not a page', () => {
		expect(GET({ params: { slug: 'docs/nope' } }).status).toBe(404);
	});
});

describe('mcpServer', () => {
	it('answers every method with the same handler over the indexes', async () => {
		const { GET, POST, OPTIONS } = handlers.mcpServer();
		expect(POST).toBe(GET);
		expect(OPTIONS).toBe(GET);

		const response = await POST(
			new Request('https://x.dev/mcp', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream',
					'mcp-protocol-version': '2025-06-18'
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'list_pages', arguments: {} }
				})
			})
		);
		const text = JSON.stringify(await response.json());
		expect(text).toContain('/docs/intro');
		expect(text).not.toContain('/docs/v1/intro');
	});
});
