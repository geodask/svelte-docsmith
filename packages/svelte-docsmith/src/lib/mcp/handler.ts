/**
 * The MCP server: a stateless slice of the Model Context Protocol over
 * Streamable HTTP, answered by our own small JSON-RPC layer rather than the
 * official SDK (see `docs/adr/0008-own-mcp-protocol-layer.md`).
 *
 * Each POST carries one JSON-RPC message and gets one `application/json`
 * response. No sessions (no `Mcp-Session-Id`), no SSE streams, no
 * server-to-client requests. The tools themselves live in `tools.ts`.
 */
import type { LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ResolvedVersion } from '#lib/core/version.js';
import type { LlmsSite } from '#lib/generate/llms.js';
import { createSearchEngine, type SearchEngine } from '#lib/search/create-search.js';
import { editorSetups } from './connect.js';
import {
	checkArguments,
	resolveVersion,
	text,
	tools,
	versionIds,
	type ToolContext
} from './tools.js';

/**
 * What the MCP server answers from: the same indexes that feed llms.txt and
 * the search box, so every surface agrees.
 *
 * @experimental Outside the 1.0 stability promise. May change in a minor.
 */
export type McpOptions = {
	/** Site title, description and origin, as for `generateLlmsTxt`. */
	site: LlmsSite;
	/** The generated `svelte-docsmith/llms` index. */
	docs: LlmsDoc[];
	/** The generated `svelte-docsmith/search` index. */
	search: SearchDoc[];
	/** The resolved versions from `svelte-docsmith/content`. */
	versions?: ResolvedVersion[];
};

/**
 * Protocol versions we speak, newest first: the handshake-based revisions that
 * run over Streamable HTTP. `initialize` echoes the client's version when it is
 * listed here and otherwise offers the first.
 */
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

/**
 * `serverInfo.version`, which the protocol requires. It versions this
 * server's protocol layer, not the package: reading the package version from
 * library code would mean importing `package.json` across the src/dist split.
 */
const SERVER_VERSION = '0.1.0';

/** JSON-RPC 2.0 error codes. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

type Id = string | number | null;
type Params = Record<string, unknown>;
type Method = (params: Params, context: ToolContext) => unknown;

/** A JSON-RPC error a method throws; the transport turns it into a response. */
class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string
	) {
		super(message);
	}
}

const CORS_HEADERS = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-allow-headers': '*',
	'access-control-max-age': '86400'
};

const isObject = (value: unknown): value is Params =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is Id =>
	typeof value === 'string' || typeof value === 'number';

/**
 * Serve the docs to coding agents over the Model Context Protocol. Returns a
 * request handler over web-standard `Request`/`Response`: pass it a `Request`,
 * or use it directly as a SvelteKit `RequestHandler`, which receives
 * `{ request }`. It answers POST (MCP messages), OPTIONS (CORS preflight) and
 * GET (a plain-text note on adding the server to an editor), so export it under
 * all three. The route needs a server runtime, so opt it out of prerendering.
 *
 * ```ts
 * // src/routes/mcp/+server.ts
 * import { docs } from 'svelte-docsmith/llms';
 * import { docs as search } from 'svelte-docsmith/search';
 * import { versions } from 'svelte-docsmith/content';
 * import { mcpHandler } from 'svelte-docsmith';
 *
 * export const prerender = false;
 * export const POST = mcpHandler({ site: { title: 'My Docs' }, docs, search, versions });
 * export { POST as GET, POST as OPTIONS };
 * ```
 *
 * @experimental Outside the 1.0 stability promise. May change in a minor.
 */
export function mcpHandler(options: McpOptions) {
	// Indexing is the costly part of search, so do it once, and only when an
	// agent first searches: a serverless instance may never be asked to.
	let engine: SearchEngine | undefined;
	const searchEngine = () => (engine ??= createSearchEngine(options.search));

	const methods: Record<string, Method> = {
		initialize: (params) => ({
			protocolVersion: negotiate(params.protocolVersion),
			capabilities: { tools: {} },
			serverInfo: {
				name: 'svelte-docsmith',
				title: `${options.site.title} docs`,
				version: SERVER_VERSION
			},
			instructions: instructions(options.site, options.versions ?? [])
		}),
		ping: () => ({}),
		'tools/list': () => ({
			tools: tools.map(({ name, title, description, inputSchema }) => ({
				name,
				title,
				description,
				inputSchema,
				annotations: { readOnlyHint: true, openWorldHint: false }
			}))
		}),
		'tools/call': (params, context) => {
			const tool = tools.find((t) => t.name === params.name);
			if (!tool) {
				throw new RpcError(
					INVALID_PARAMS,
					typeof params.name === 'string'
						? `Unknown tool: ${params.name}`
						: 'tools/call needs a tool name'
				);
			}
			const args = params.arguments ?? {};
			if (!isObject(args)) {
				throw new RpcError(INVALID_PARAMS, `${tool.name}: arguments must be an object`);
			}
			// A bad argument is a tool error, not a protocol error, so the model
			// sees what was wrong and can retry (MCP 2025-11-25, server/tools).
			const problem = checkArguments(tool.inputSchema, args);
			if (problem) return text(`${tool.name}: ${problem}`, true);
			const scope = resolveVersion(args.version as string | undefined, context.versions);
			if (scope.problem) return text(`${tool.name}: ${scope.problem}`, true);
			return tool.call(args, { ...context, version: scope.version });
		}
	};

	/**
	 * Answer one parsed JSON-RPC message. `version` is the request's
	 * `MCP-Protocol-Version` header, which clients send after `initialize`.
	 */
	function answer(message: unknown, version: string | null, context: ToolContext): Response {
		if (!isObject(message) || message.jsonrpc !== '2.0') {
			return error(null, INVALID_REQUEST, 'Expected a single JSON-RPC 2.0 message', 400);
		}
		const id = message.id;
		if (id !== undefined && !isId(id)) {
			return error(null, INVALID_REQUEST, 'A request id must be a string or a number', 400);
		}
		// The spec requires a 400 for a version we don't speak. `initialize` is
		// exempt: its body is where the version gets negotiated. The error is a
		// plain invalid-request on purpose: the newer per-request revisions read a
		// 400 without one of their own error codes as "fall back to initialize".
		if (message.method !== 'initialize' && version && !PROTOCOL_VERSIONS.includes(version)) {
			return error(
				id ?? null,
				INVALID_REQUEST,
				`Unsupported MCP-Protocol-Version "${version}". ` +
					`This server speaks ${PROTOCOL_VERSIONS.join(', ')}; initialize to negotiate one.`,
				400
			);
		}
		if (typeof message.method !== 'string') {
			// A response to a request we never send; accept it and move on.
			if (id !== undefined && ('result' in message || 'error' in message)) return accepted();
			return error(id ?? null, INVALID_REQUEST, 'A request needs a method', 400);
		}
		// Notifications (no id) need no answer, and we act on none of them.
		if (id === undefined) return accepted();

		const method = methods[message.method];
		if (!method) return error(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`);
		const params = message.params ?? {};
		if (!isObject(params)) return error(id, INVALID_PARAMS, 'params must be an object');
		try {
			return json({ jsonrpc: '2.0', id, result: method(params, context) });
		} catch (thrown) {
			if (thrown instanceof RpcError) return error(id, thrown.code, thrown.message);
			return error(id, INTERNAL_ERROR, 'Internal error');
		}
	}

	return async (input: Request | { request: Request }): Promise<Response> => {
		const request = input instanceof Request ? input : input.request;
		if (request.method === 'OPTIONS')
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		if (request.method !== 'POST') return browserNote(options.site, new URL(request.url));

		let message: unknown;
		try {
			message = JSON.parse(await request.text());
		} catch {
			return error(null, PARSE_ERROR, 'Parse error: the body is not valid JSON', 400);
		}
		if (Array.isArray(message)) {
			return error(null, INVALID_REQUEST, 'Batched JSON-RPC messages are not supported', 400);
		}
		return answer(message, request.headers.get('mcp-protocol-version'), {
			site: options.site,
			docs: options.docs,
			searchEngine,
			versions: options.versions ?? [],
			endpoint: new URL(request.url)
		});
	};
}

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: CORS_HEADERS });
}

function error(id: Id, code: number, message: string, status = 200): Response {
	return json({ jsonrpc: '2.0', id, error: { code, message } }, status);
}

function accepted(): Response {
	return new Response(null, { status: 202, headers: CORS_HEADERS });
}

/**
 * What a person who opens the server's URL in a browser sees: a 405 (this
 * server offers no SSE stream on GET, so the spec has it refuse GET) whose
 * plain-text body says what the URL is for and how to connect an editor.
 */
function browserNote({ title }: LlmsSite, endpoint: URL): Response {
	const url = endpoint.origin + endpoint.pathname;
	const setup = editorSetups(title, url).flatMap(({ editor, file, code }) => [
		file ? `${editor} (${file}):` : `${editor}:`,
		...code.split('\n').map((line) => `  ${line}`),
		''
	]);
	const note = [
		`This is the MCP server for the ${title} documentation.`,
		'',
		'It speaks the Model Context Protocol over HTTP, so it is meant for coding agents,',
		'not browsers. Add this URL to your editor to let its agent list, search and read',
		'these docs:',
		'',
		`  ${url}`,
		'',
		...setup
	].join('\n');
	return new Response(note, {
		status: 405,
		headers: {
			...CORS_HEADERS,
			allow: 'POST, OPTIONS',
			'content-type': 'text/plain; charset=utf-8'
		}
	});
}

/** Echo the client's version when we speak it, else offer our latest. */
function negotiate(requested: unknown): string {
	return typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
		? requested
		: PROTOCOL_VERSIONS[0];
}

function instructions({ title, description }: LlmsSite, versions: ResolvedVersion[]): string {
	const about = description ? `${title}: ${description}` : title;
	const versioned = versions.length
		? `\n\nThe docs are versioned (${versionIds(versions)}). Every tool reads the current ` +
			'version unless you pass its `version` argument, e.g. to match an older installed release.'
		: '';
	return (
		`The documentation for ${about}\n\n` +
		`This server answers questions about these docs. Read the pages before answering ` +
		`questions about ${title}, rather than relying on memory: search_docs to find pages ` +
		`by topic, list_pages to browse every page, and get_page to read one in full as markdown.` +
		versioned
	);
}
