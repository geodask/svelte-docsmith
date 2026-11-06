import { describe, expect, it, vi } from 'vitest';
import { mcpHandler } from '#lib/index.js';
import type { LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ResolvedVersion } from '#lib/core/version.js';
import { createSearchEngine } from '#lib/search/create-search.js';

// Pass-through spy, so the search_docs tests can count index builds.
vi.mock('#lib/search/create-search.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/search/create-search.js')>();
	return { ...actual, createSearchEngine: vi.fn(actual.createSearchEngine) };
});

const ENDPOINT = 'https://my-docs.dev/mcp';

const docs: LlmsDoc[] = [
	{
		path: '/docs/intro',
		title: 'Introduction',
		section: 'Getting Started',
		order: 1,
		description: 'What this is',
		content: '# Introduction\n\nWelcome to the docs.'
	},
	{
		path: '/docs/components/badge',
		title: 'Badge',
		section: 'Components',
		order: 2,
		content: '# Badge\n\n## Props\n\n| Prop | Type |\n| --- | --- |\n| `variant?` | `string` |'
	}
];

const search: SearchDoc[] = docs.map((d) => ({
	path: d.path,
	title: d.title,
	section: d.section,
	headings: [],
	text: d.content
}));

const site = {
	title: 'My Docs',
	description: 'Docs for my library',
	origin: 'https://my-docs.dev'
};

function handler() {
	return mcpHandler({ site, docs, search, versions: [] });
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
	return new Request(ENDPOINT, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			...headers
		},
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

async function rpc(method: string, params?: unknown, headers?: Record<string, string>) {
	const res = await handler()(post({ jsonrpc: '2.0', id: 1, method, params }, headers));
	return { res, body: await res.json() };
}

describe('mcpHandler: initialize', () => {
	it('echoes a supported protocol version and describes the server', async () => {
		const { res, body } = await rpc('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'test', version: '1.0.0' }
		});

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/^application\/json/);
		expect(res.headers.get('mcp-session-id')).toBeNull();
		expect(body.jsonrpc).toBe('2.0');
		expect(body.id).toBe(1);
		expect(body.result.protocolVersion).toBe('2025-06-18');
		expect(body.result.capabilities).toEqual({ tools: {} });
		expect(body.result.serverInfo.name).toBe('svelte-docsmith');
		expect(typeof body.result.serverInfo.version).toBe('string');
		expect(body.result.instructions).toContain('My Docs');
		expect(body.result.instructions).toContain('Docs for my library');
	});

	it('answers with its latest version when the client asks for one it does not speak', async () => {
		const { body } = await rpc('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo: { name: 'test', version: '1.0.0' }
		});
		expect(body.result.protocolVersion).toBe('2025-11-25');
	});

	it('leaves the description out of the instructions when the site has none', async () => {
		const res = await mcpHandler({ site: { title: 'Bare' }, docs, search })(
			post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 'x' } })
		);
		const { result } = await res.json();
		expect(result.instructions).toContain('Bare');
		expect(result.instructions).not.toContain('undefined');
	});

	it('says when to use each tool, and nothing about versions on an unversioned site', async () => {
		const { body } = await rpc('initialize', { protocolVersion: '2025-11-25' });
		const { instructions } = body.result;
		expect(instructions).toMatch(/search_docs[^.]*find/);
		expect(instructions).toMatch(/list_pages[^.]*browse/);
		expect(instructions).toMatch(/get_page[^.]*read/);
		expect(instructions).not.toContain('version');
	});

	it('mentions the version argument and the versions on a versioned site', async () => {
		const versions: ResolvedVersion[] = [
			{ id: 'v2', label: 'v2', basePath: '/docs', landing: '/docs', current: true, noindex: false },
			{
				id: 'v1',
				label: 'v1',
				basePath: '/docs/v1',
				landing: '/docs/v1',
				current: false,
				noindex: false
			}
		];
		const res = await mcpHandler({ site, docs, search, versions })(
			post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 'x' } })
		);
		const { instructions } = (await res.json()).result;
		expect(instructions).toContain('`version`');
		expect(instructions).toContain('v2 (current), v1');
	});
});

describe('mcpHandler: ping', () => {
	it('answers with an empty result', async () => {
		const { res, body } = await rpc('ping');
		expect(res.status).toBe(200);
		expect(body).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
	});
});

describe('mcpHandler: tools/list', () => {
	it('describes get_page with a JSON Schema input requiring a path', async () => {
		const { res, body } = await rpc('tools/list');
		expect(res.status).toBe(200);
		const getPage = body.result.tools.find((t: { name: string }) => t.name === 'get_page');
		expect(getPage.description).toEqual(expect.any(String));
		expect(getPage.inputSchema).toMatchObject({
			type: 'object',
			properties: { path: { type: 'string' } },
			required: ['path']
		});
	});

	it('lists list_pages, search_docs and get_page, each read-only with a JSON Schema input', async () => {
		const { body } = await rpc('tools/list');
		const tools = body.result.tools;
		expect(tools.map((t: { name: string }) => t.name)).toEqual([
			'list_pages',
			'search_docs',
			'get_page'
		]);
		for (const tool of tools) {
			expect(tool.description).toEqual(expect.any(String));
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.annotations).toEqual({ readOnlyHint: true, openWorldHint: false });
		}
	});

	it('describes search_docs with a required string query and an optional integer limit', async () => {
		const { body } = await rpc('tools/list');
		const searchDocs = body.result.tools.find((t: { name: string }) => t.name === 'search_docs');
		expect(searchDocs.inputSchema).toEqual({
			type: 'object',
			properties: {
				query: { type: 'string', description: expect.any(String) },
				limit: { type: 'integer', description: expect.any(String) },
				version: { type: 'string', description: expect.any(String) }
			},
			required: ['query']
		});
	});

	it('describes list_pages as taking only an optional version', async () => {
		const { body } = await rpc('tools/list');
		const listPages = body.result.tools.find((t: { name: string }) => t.name === 'list_pages');
		expect(listPages.inputSchema).toEqual({
			type: 'object',
			properties: { version: { type: 'string', description: expect.any(String) } }
		});
	});

	it('documents an optional version string on every tool', async () => {
		const { body } = await rpc('tools/list');
		for (const tool of body.result.tools) {
			const { version } = tool.inputSchema.properties;
			expect(version, tool.name).toEqual({ type: 'string', description: expect.any(String) });
			expect(version.description, tool.name).toMatch(/current version/);
			expect(tool.inputSchema.required ?? [], tool.name).not.toContain('version');
		}
	});
});

async function getPage(args: unknown) {
	const { res, body } = await rpc('tools/call', { name: 'get_page', arguments: args });
	expect(res.status).toBe(200);
	return body;
}

describe('mcpHandler: get_page', () => {
	it("returns the page's agent markdown as text content", async () => {
		const body = await getPage({ path: '/docs/components/badge' });
		expect(body.result.isError).toBeFalsy();
		expect(body.result.content).toEqual([{ type: 'text', text: docs[1].content }]);
	});

	it.each([
		['a trailing slash', '/docs/intro/'],
		['a trailing .md', '/docs/intro.md'],
		['no leading slash', 'docs/intro'],
		['a full URL on the site origin', 'https://my-docs.dev/docs/intro'],
		['a full .md URL with a hash', 'https://my-docs.dev/docs/intro.md#welcome'],
		['a full URL on the origin the request came to', 'https://preview.my-docs.dev/docs/intro/']
	])('finds the page from a path with %s', async (_, path) => {
		const res = await mcpHandler({ site, docs, search })(
			new Request('https://preview.my-docs.dev/mcp', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'get_page', arguments: { path } }
				})
			})
		);
		const body = await res.json();
		expect(body.result.isError).toBeFalsy();
		expect(body.result.content[0].text).toBe(docs[0].content);
	});

	it('reports a miss as a tool error naming the path and pointing at the other tools', async () => {
		const body = await getPage({ path: '/docs/nope' });
		expect(body.error).toBeUndefined();
		expect(body.result.isError).toBe(true);
		const [{ type, text }] = body.result.content;
		expect(type).toBe('text');
		expect(text).toContain('/docs/nope');
		expect(text).toContain('search_docs');
		expect(text).toContain('list_pages');
	});

	it('does not read a page through a URL on another origin', async () => {
		const body = await getPage({ path: 'https://elsewhere.dev/docs/intro' });
		expect(body.result.isError).toBe(true);
		expect(body.result.content[0].text).toContain('https://elsewhere.dev/docs/intro');
	});

	it('reads a full URL as if the site had no origin when its origin is malformed', async () => {
		const result = await callTool(
			'get_page',
			{ path: 'https://my-docs.dev/docs/intro' },
			{ site: { title: 'My Docs', origin: 'not a url' } }
		);
		expect(result.isError).toBeFalsy();
		expect(result.content[0].text).toBe(docs[0].content);
	});
});

/** Call one tool on a handler over the given options, expecting a result. */
async function callTool(
	name: string,
	args: unknown,
	options: Partial<Parameters<typeof mcpHandler>[0]> = {},
	serve = mcpHandler({ site, docs, search, versions: [], ...options })
) {
	const res = await serve(
		post({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
	);
	expect(res.status).toBe(200);
	const body = await res.json();
	expect(body.error).toBeUndefined();
	return body.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
}

describe('mcpHandler: list_pages', () => {
	// Deliberately out of order: sections and pages sort by `order`, as in llms.txt.
	const shuffled: LlmsDoc[] = [
		{
			path: '/docs/components/card',
			title: 'Card',
			section: 'Components',
			order: 4,
			description: 'A boxed group',
			content: ''
		},
		{ path: '/docs/faq', title: 'FAQ', order: 5, content: '' },
		{
			path: '/docs/intro',
			title: 'Introduction',
			section: 'Getting Started',
			order: 1,
			description: 'What this is',
			content: ''
		},
		{
			path: '/docs/components/badge',
			title: 'Badge',
			section: 'Components',
			order: 3,
			content: ''
		},
		{
			path: '/docs/install',
			title: 'Installation',
			section: 'Getting Started',
			order: 2,
			description: 'Add it to a project',
			content: ''
		}
	];

	it('lists every page by section in sidebar reading order, with absolute paths', async () => {
		const result = await callTool('list_pages', {}, { docs: shuffled });
		expect(result.isError).toBeFalsy();
		expect(result.content).toEqual([
			{
				type: 'text',
				text: [
					'## Getting Started',
					'',
					'- [Introduction](https://my-docs.dev/docs/intro): What this is',
					'- [Installation](https://my-docs.dev/docs/install): Add it to a project',
					'',
					'## Components',
					'',
					'- [Badge](https://my-docs.dev/docs/components/badge)',
					'- [Card](https://my-docs.dev/docs/components/card): A boxed group',
					'',
					'## Docs',
					'',
					'- [FAQ](https://my-docs.dev/docs/faq)'
				].join('\n')
			}
		]);
	});

	it('keeps paths site-relative when the site has no origin', async () => {
		const result = await callTool('list_pages', {}, { docs: shuffled, site: { title: 'My Docs' } });
		expect(result.content[0].text).toContain('- [Introduction](/docs/intro): What this is');
		expect(result.content[0].text).not.toContain('https://');
	});
});

describe('mcpHandler: search_docs', () => {
	const pages: SearchDoc[] = [
		{
			path: '/docs/intro',
			title: 'Introduction',
			section: 'Getting Started',
			headings: [],
			text: 'Welcome to the docs.'
		},
		{
			path: '/docs/components/button',
			title: 'Button',
			section: 'Components',
			headings: ['Props'],
			text: 'A clickable button. Pair it with the theming tokens to match your brand colors.'
		},
		{
			path: '/docs/theming',
			title: 'Theming',
			headings: ['Dark mode'],
			text: 'Set colors with CSS variables. Dark mode follows the system setting.'
		}
	];

	it('returns ranked hits with title, path, section and a snippet', async () => {
		const result = await callTool('search_docs', { query: 'theming' }, { search: pages });
		expect(result.isError).toBeFalsy();
		expect(result.content).toEqual([
			{
				type: 'text',
				text: [
					'1. [Theming](https://my-docs.dev/docs/theming)',
					'   Set colors with CSS variables. Dark mode follows the system setting.',
					'',
					'2. [Button](https://my-docs.dev/docs/components/button) (Components)',
					'   A clickable button. Pair it with the theming tokens to match your brand colors.'
				].join('\n')
			}
		]);
	});

	it.each([
		['a missing query', {}],
		['a query that is not a string', { query: 42 }],
		['a blank query', { query: '   ' }]
	])('reports %s as a tool error naming the query argument', async (_, args) => {
		const result = await callTool('search_docs', args, { search: pages });
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('"query"');
	});

	it('says so when nothing matches, pointing at list_pages', async () => {
		const result = await callTool('search_docs', { query: 'kubernetes' }, { search: pages });
		expect(result.isError).toBeFalsy();
		expect(result.content[0].text).toContain('kubernetes');
		expect(result.content[0].text).toContain('list_pages');
	});

	it('builds the search index once per handler, on the first search', async () => {
		const build = vi.mocked(createSearchEngine);
		build.mockClear();
		const serve = mcpHandler({ site, docs, search: pages });

		await callTool('list_pages', {}, {}, serve);
		await callTool('get_page', { path: '/docs/intro' }, {}, serve);
		expect(build).not.toHaveBeenCalled();

		await callTool('search_docs', { query: 'theming' }, {}, serve);
		await callTool('search_docs', { query: 'colors' }, {}, serve);
		expect(build).toHaveBeenCalledTimes(1);
		expect(build).toHaveBeenCalledWith(pages);
	});

	describe('limit', () => {
		const many: SearchDoc[] = Array.from({ length: 30 }, (_, i) => ({
			path: `/docs/guide-${i + 1}`,
			title: `Guide ${i + 1}`,
			headings: [],
			text: 'A guide to configuration.'
		}));
		const hitCount = (text: string) => text.split('\n').filter((l) => /^\d+\. \[/.test(l)).length;

		it.each([
			['defaults to 8', undefined, 8],
			['is honoured', 3, 3],
			['is capped at 20', 500, 20],
			['returns at least one hit', 0, 1]
		])('%s', async (_, limit, expected) => {
			const result = await callTool(
				'search_docs',
				{ query: 'configuration', limit },
				{ search: many }
			);
			expect(result.isError).toBeFalsy();
			expect(hitCount(result.content[0].text)).toBe(expected);
		});
	});
});

describe('mcpHandler: version scoping', () => {
	// A versioned site: v2 is current (unprefixed), v1 is archived under /docs/v1.
	const versions: ResolvedVersion[] = [
		{
			id: 'v2',
			label: 'v2',
			basePath: '/docs',
			landing: '/docs/intro',
			current: true,
			noindex: false
		},
		{
			id: 'v1',
			label: 'v1',
			basePath: '/docs/v1',
			landing: '/docs/v1/intro',
			current: false,
			noindex: false
		}
	];
	const versionedDocs: LlmsDoc[] = [
		{
			path: '/docs/intro',
			title: 'Introduction',
			order: 1,
			version: 'v2',
			content: '# Introduction\n\nWelcome to v2.'
		},
		{ path: '/docs/signals', title: 'Signals', order: 2, version: 'v2', content: '# Signals' },
		{
			path: '/docs/v1/intro',
			title: 'Introduction',
			order: 1,
			version: 'v1',
			content: '# Introduction\n\nWelcome to v1.'
		},
		{ path: '/docs/v1/stores', title: 'Stores', order: 2, version: 'v1', content: '# Stores' }
	];
	const versionedSearch: SearchDoc[] = versionedDocs.map((d) => ({
		path: d.path,
		title: d.title,
		headings: [],
		text: `${d.content} Reactivity guide.`,
		version: d.version
	}));
	const versioned = { docs: versionedDocs, search: versionedSearch, versions };

	describe('list_pages', () => {
		it('lists only the current version by default', async () => {
			const { content } = await callTool('list_pages', {}, versioned);
			expect(content[0].text).toContain('/docs/signals');
			expect(content[0].text).not.toContain('/docs/v1/');
		});

		it('lists only the requested version', async () => {
			const { content } = await callTool('list_pages', { version: 'v1' }, versioned);
			expect(content[0].text).toBe(
				[
					'## Docs',
					'',
					'- [Introduction](https://my-docs.dev/docs/v1/intro)',
					'- [Stores](https://my-docs.dev/docs/v1/stores)'
				].join('\n')
			);
		});
	});

	describe('search_docs', () => {
		const hitPaths = (text: string) =>
			[...text.matchAll(/^\d+\. \[[^\]]+\]\(https:\/\/my-docs\.dev([^)]+)\)/gm)].map((m) => m[1]);

		it('searches only the current version by default', async () => {
			const { content } = await callTool('search_docs', { query: 'reactivity' }, versioned);
			expect(hitPaths(content[0].text).sort()).toEqual(['/docs/intro', '/docs/signals']);
		});

		it('searches only the requested version', async () => {
			const { content } = await callTool(
				'search_docs',
				{ query: 'reactivity', version: 'v1' },
				versioned
			);
			expect(hitPaths(content[0].text).sort()).toEqual(['/docs/v1/intro', '/docs/v1/stores']);
		});
	});

	describe('get_page', () => {
		it('reads a current-version page by default', async () => {
			const result = await callTool('get_page', { path: '/docs/intro' }, versioned);
			expect(result.isError).toBeFalsy();
			expect(result.content[0].text).toBe('# Introduction\n\nWelcome to v2.');
		});

		it('reads a page of the requested version', async () => {
			const result = await callTool(
				'get_page',
				{ path: '/docs/v1/intro', version: 'v1' },
				versioned
			);
			expect(result.isError).toBeFalsy();
			expect(result.content[0].text).toBe('# Introduction\n\nWelcome to v1.');
		});

		it.each([
			['an archived page with no version', { path: '/docs/v1/stores' }, 'v1'],
			['a current page under an archived version', { path: '/docs/signals', version: 'v1' }, 'v2']
		])('misses %s, naming the version that has it', async (_, args, owner) => {
			const result = await callTool('get_page', args, versioned);
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain(args.path);
			expect(result.content[0].text).toContain(`version "${owner}"`);
		});
	});

	it.each([
		['list_pages', {}],
		['search_docs', { query: 'reactivity' }],
		['get_page', { path: '/docs/intro' }]
	])('%s reports an unknown version as a tool error listing the valid ids', async (name, args) => {
		const result = await callTool(name, { ...args, version: 'v9' }, versioned);
		expect(result.isError).toBe(true);
		const [{ text }] = result.content;
		expect(text).toContain('"v9"');
		expect(text).toMatch(/v2 \(current\), v1/);
	});

	it.each([
		['list_pages', {}],
		['search_docs', { query: 'welcome' }],
		['get_page', { path: '/docs/intro' }]
	])('%s ignores the version on an unversioned site', async (name, args) => {
		const without = await callTool(name, args);
		const withVersion = await callTool(name, { ...args, version: 'v9' });
		expect(without.isError).toBeFalsy();
		expect(withVersion).toEqual(without);
	});
});

describe('mcpHandler: JSON-RPC envelope', () => {
	it.each([
		['notifications/initialized', { jsonrpc: '2.0', method: 'notifications/initialized' }],
		['a notification it does not know', { jsonrpc: '2.0', method: 'notifications/whatever' }],
		['a JSON-RPC response from the client', { jsonrpc: '2.0', id: 7, result: {} }]
	])('accepts %s with 202 and no body', async (_, message) => {
		const res = await handler()(post(message));
		expect(res.status).toBe(202);
		expect(await res.text()).toBe('');
	});

	it('answers an unknown method with method-not-found, echoing the id', async () => {
		const res = await handler()(post({ jsonrpc: '2.0', id: 'abc', method: 'resources/list' }));
		const body = await res.json();
		expect(body.id).toBe('abc');
		expect(body.error.code).toBe(-32601);
		expect(body.error.message).toContain('resources/list');
		expect(body.result).toBeUndefined();
	});

	it('answers malformed JSON with a parse error and a null id', async () => {
		const res = await handler()(post('{"jsonrpc": "2.0", "id": 1,'));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32700 } });
	});

	it.each([
		['a message without jsonrpc 2.0', { id: 1, method: 'ping' }],
		['a non-object message', 42],
		['a batch', [{ jsonrpc: '2.0', id: 1, method: 'ping' }]],
		['a request with an object id', { jsonrpc: '2.0', id: { x: 1 }, method: 'ping' }]
	])('answers %s with invalid-request', async (_, message) => {
		const res = await handler()(post(message));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe(-32600);
	});
});

describe('mcpHandler: tools/call arguments', () => {
	it.each([
		['an unknown tool', { name: 'delete_everything', arguments: {} }, 'delete_everything'],
		['no tool name', { arguments: { path: '/docs/intro' } }, 'name'],
		[
			'arguments that are not an object',
			{ name: 'get_page', arguments: ['/docs/intro'] },
			'arguments'
		]
	])('answers %s with invalid-params', async (_, params, mentioned) => {
		const { body } = await rpc('tools/call', params);
		expect(body.id).toBe(1);
		expect(body.error.code).toBe(-32602);
		expect(body.error.message).toContain(mentioned);
	});

	// MCP 2025-11-25 (server/tools, Error Handling): input validation failures
	// are tool execution errors the model can act on, not protocol errors.
	it.each([
		['a missing required argument', { name: 'get_page', arguments: {} }, '"path"'],
		['no arguments at all', { name: 'get_page' }, '"path"'],
		['an argument of the wrong type', { name: 'get_page', arguments: { path: 3 } }, '"path"']
	])('reports %s as a tool error naming the argument', async (_, params, mentioned) => {
		const { res, body } = await rpc('tools/call', params);
		expect(res.status).toBe(200);
		expect(body.error).toBeUndefined();
		expect(body.result.isError).toBe(true);
		expect(body.result.content[0].type).toBe('text');
		expect(body.result.content[0].text).toContain(mentioned);
	});

	it('answers a request whose params are not an object with invalid-params', async () => {
		const { body } = await rpc('tools/call', 'get_page');
		expect(body.error.code).toBe(-32602);
	});
});

describe('mcpHandler: protocol version header', () => {
	it('serves a request carrying a version it speaks', async () => {
		const { res, body } = await rpc('ping', undefined, { 'mcp-protocol-version': '2025-06-18' });
		expect(res.status).toBe(200);
		expect(body.result).toEqual({});
	});

	it('rejects a request carrying a version it does not speak with 400, naming the ones it does', async () => {
		const res = await handler()(
			post(
				{ jsonrpc: '2.0', id: 1, method: 'tools/list' },
				{ 'mcp-protocol-version': '1999-01-01' }
			)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.id).toBe(1);
		expect(body.error.code).toBe(-32600);
		expect(body.error.message).toContain('1999-01-01');
		expect(body.error.message).toContain('2025-11-25');
	});

	it('lets initialize through whatever the header says, since the body negotiates', async () => {
		const res = await handler()(
			post(
				{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } },
				{ 'mcp-protocol-version': '1999-01-01' }
			)
		);
		expect(res.status).toBe(200);
		expect((await res.json()).result.protocolVersion).toBe('2025-11-25');
	});
});

describe('mcpHandler: HTTP', () => {
	const CORS = 'access-control-allow-origin';

	it.each([
		['a JSON-RPC result', () => post({ jsonrpc: '2.0', id: 1, method: 'ping' })],
		['a JSON-RPC error', () => post('not json')],
		['a 202', () => post({ jsonrpc: '2.0', method: 'notifications/initialized' })],
		['a GET', () => new Request(ENDPOINT)]
	])('puts open CORS headers on %s', async (_, request) => {
		const res = await handler()(request());
		expect(res.headers.get(CORS)).toBe('*');
	});

	it('answers the CORS preflight', async () => {
		const res = await handler()(
			new Request(ENDPOINT, {
				method: 'OPTIONS',
				headers: {
					origin: 'https://agent.example',
					'access-control-request-method': 'POST',
					'access-control-request-headers': 'content-type, mcp-protocol-version'
				}
			})
		);
		expect(res.status).toBe(204);
		expect(res.headers.get(CORS)).toBe('*');
		expect(res.headers.get('access-control-allow-methods')).toContain('POST');
		expect(res.headers.get('access-control-allow-headers')).toBeTruthy();
		expect(await res.text()).toBe('');
	});

	it('answers a GET with 405, an Allow header and a note on adding the server to an editor', async () => {
		const res = await handler()(new Request(ENDPOINT, { headers: { accept: 'text/html' } }));
		expect(res.status).toBe(405);
		expect(res.headers.get('allow')).toBe('POST, OPTIONS');
		expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
		const note = await res.text();
		expect(note).toContain('MCP');
		expect(note).toContain('My Docs');
		expect(note).toContain(ENDPOINT);
		expect(note).toContain('claude mcp add');
	});

	it('answers other methods with 405', async () => {
		const res = await handler()(new Request(ENDPOINT, { method: 'DELETE' }));
		expect(res.status).toBe(405);
		expect(res.headers.get('allow')).toBe('POST, OPTIONS');
	});

	it('works as a SvelteKit request handler, which receives { request }', async () => {
		const res = await handler()({ request: post({ jsonrpc: '2.0', id: 1, method: 'ping' }) });
		expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
	});
});
