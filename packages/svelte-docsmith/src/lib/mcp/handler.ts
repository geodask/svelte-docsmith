/**
 * The MCP server: a stateless slice of the Model Context Protocol over
 * Streamable HTTP, answered by our own small JSON-RPC layer rather than the
 * official SDK (see `docs/adr/0008-own-mcp-protocol-layer.md`).
 *
 * Each POST carries one JSON-RPC message and gets one `application/json`
 * response. No sessions (no `Mcp-Session-Id`), no SSE streams, no
 * server-to-client requests. The tools themselves live in `tools.ts`.
 *
 * It is dual-era. A request whose `params._meta` names a protocol version is
 * answered by the per-request revision 2026-07-28; any other request by the
 * handshake revisions (`initialize`, then the `MCP-Protocol-Version` header).
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
	/** Site title, description and origin, as for llms.txt. */
	site: LlmsSite;
	/** The generated `svelte-docsmith/llms` index. */
	docs: LlmsDoc[];
	/** The generated `svelte-docsmith/search` index. */
	search: SearchDoc[];
	/** The resolved versions from `svelte-docsmith/content`. */
	versions?: ResolvedVersion[];
};

/**
 * The handshake-based ("legacy") revisions we speak, newest first, all over
 * Streamable HTTP. `initialize` echoes the client's version when it is listed
 * here and otherwise offers the first.
 */
const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

/**
 * The per-request ("modern") revisions we speak. These have no handshake: each
 * request names its version in `params._meta`, and is answered on its own.
 */
const MODERN_VERSIONS = ['2026-07-28'];

/** Every version we speak, newest first, as `server/discover` lists them. */
const SUPPORTED_VERSIONS = [...MODERN_VERSIONS, ...LEGACY_VERSIONS];

/** The reserved `_meta` keys of the modern revisions. */
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';

/**
 * How long a modern client may treat `server/discover` and `tools/list` as
 * fresh. Both only change when the site is redeployed, and both are the same
 * for every reader, so any cache may share them.
 */
const CACHEABLE = { ttlMs: 60 * 60 * 1000, cacheScope: 'public' } as const;

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

/** MCP's own error codes, from 2026-07-28 (basic, Error Codes). */
const HEADER_MISMATCH = -32020;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;

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
 * GET (a plain-text note on adding the server to an editor). Sites get it
 * through `mcpServer()` in `svelte-docsmith/server`, which passes it the
 * generated indexes.
 *
 * @experimental Outside the 1.0 stability promise. May change in a minor.
 */
export function mcpHandler(options: McpOptions) {
	// Indexing is the costly part of search, so do it once, and only when an
	// agent first searches: a serverless instance may never be asked to.
	let engine: SearchEngine | undefined;
	const searchEngine = () => (engine ??= createSearchEngine(options.search));

	const serverInfo = {
		name: 'svelte-docsmith',
		title: `${options.site.title} docs`,
		version: SERVER_VERSION
	};
	const capabilities = { tools: {} };
	const guidance = instructions(options.site, options.versions ?? []);

	const listTools = () => ({
		tools: tools.map(({ name, title, description, inputSchema }) => ({
			name,
			title,
			description,
			inputSchema,
			annotations: { readOnlyHint: true, openWorldHint: false }
		}))
	});

	const callTool: Method = (params, context) => {
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
	};

	/** The handshake-based revisions' methods, answered as those revisions define. */
	const legacyMethods: Record<string, Method> = {
		initialize: (params) => ({
			protocolVersion: negotiate(params.protocolVersion),
			capabilities,
			serverInfo,
			instructions: guidance
		}),
		ping: () => ({}),
		'tools/list': listTools,
		'tools/call': callTool
	};

	/**
	 * The 2026-07-28 methods. That revision drops `initialize` and `ping`, makes
	 * `server/discover` mandatory, and has `tools/list` carry caching hints.
	 */
	const modernMethods: Record<string, Method> = {
		'server/discover': () => ({
			supportedVersions: SUPPORTED_VERSIONS,
			capabilities,
			instructions: guidance,
			...CACHEABLE
		}),
		'tools/list': () => ({ ...listTools(), ...CACHEABLE }),
		'tools/call': callTool
	};

	/** Run a method, turning what it returns or throws into a JSON-RPC response. */
	function run(
		method: Method,
		id: Id,
		params: Params,
		context: ToolContext,
		wrap: (result: unknown) => unknown = (result) => result
	): Response {
		try {
			return json({ jsonrpc: '2.0', id, result: wrap(method(params, context)) });
		} catch (thrown) {
			if (thrown instanceof RpcError) return error(id, thrown.code, thrown.message);
			return error(id, INTERNAL_ERROR, 'Internal error');
		}
	}

	/** Answer one parsed JSON-RPC message, by the era its `_meta` declares. */
	function answer(message: unknown, headers: Headers, context: ToolContext): Response {
		if (!isObject(message) || message.jsonrpc !== '2.0') {
			return error(null, INVALID_REQUEST, 'Expected a single JSON-RPC 2.0 message', 400);
		}
		const id = message.id;
		if (id !== undefined && !isId(id)) {
			return error(null, INVALID_REQUEST, 'A request id must be a string or a number', 400);
		}
		const declared = declaredVersion(message.params);
		return declared.modern
			? answerModern(message, id, declared.version, headers, context)
			: answerLegacy(message, id, headers.get('mcp-protocol-version'), context);
	}

	/**
	 * Answer a request that names its version in `_meta`, statelessly, by the
	 * 2026-07-28 rules.
	 */
	function answerModern(
		message: Params,
		id: Id | undefined,
		version: unknown,
		headers: Headers,
		context: ToolContext
	): Response {
		if (typeof message.method !== 'string') {
			return error(id ?? null, INVALID_REQUEST, 'A request needs a method', 400);
		}
		if (id === undefined) return accepted();
		// The version comes first: the rules every later check applies belong
		// to a version, and this error is the one that tells a dual-era client
		// what to retry with (`supported`, where a handshake version means
		// "initialize") rather than leaving it to guess.
		if (typeof version === 'string' && !MODERN_VERSIONS.includes(version)) {
			return json(
				{
					jsonrpc: '2.0',
					id,
					error: {
						code: UNSUPPORTED_PROTOCOL_VERSION,
						message: 'Unsupported protocol version',
						data: { supported: SUPPORTED_VERSIONS, requested: version }
					}
				},
				400
			);
		}
		const params = message.params as Params;
		const meta = params._meta as Params;
		// basic/index, `_meta`: a request missing a required field is malformed.
		if (typeof version !== 'string' || !isObject(meta[CLIENT_CAPABILITIES_KEY])) {
			return error(
				id,
				INVALID_PARAMS,
				`_meta needs a string "${PROTOCOL_VERSION_KEY}" and an object "${CLIENT_CAPABILITIES_KEY}"`,
				400
			);
		}
		const mismatch = headerMismatch(headers, message.method, params, version);
		if (mismatch) return error(id, HEADER_MISMATCH, mismatch, 400);
		const method = modernMethods[message.method];
		if (!method) return error(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`, 404);
		return run(method, id, params, context, (result) => ({
			resultType: 'complete',
			...(result as Params),
			_meta: { [SERVER_INFO_KEY]: serverInfo }
		}));
	}

	/**
	 * Answer a request from a handshake-based client. `version` is the request's
	 * `MCP-Protocol-Version` header, which clients send after `initialize`.
	 */
	function answerLegacy(
		message: Params,
		id: Id | undefined,
		version: string | null,
		context: ToolContext
	): Response {
		// The spec requires a 400 for a version we don't speak. `initialize` is
		// exempt: its body is where the version gets negotiated. The error is a
		// plain invalid-request on purpose: the newer per-request revisions read a
		// 400 without one of their own error codes as "fall back to initialize".
		if (message.method !== 'initialize' && version && !LEGACY_VERSIONS.includes(version)) {
			// A per-request version on the header but not in the body: the request
			// is missing a field that revision requires (basic/index, `_meta`).
			if (MODERN_VERSIONS.includes(version)) {
				return error(
					id ?? null,
					INVALID_PARAMS,
					`MCP-Protocol-Version ${version} needs params._meta to carry "${PROTOCOL_VERSION_KEY}".`,
					400
				);
			}
			return error(
				id ?? null,
				INVALID_REQUEST,
				`Unsupported MCP-Protocol-Version "${version}". ` +
					`This server speaks ${LEGACY_VERSIONS.join(', ')} (initialize to negotiate one) ` +
					`and ${MODERN_VERSIONS.join(', ')} (named in each request's params._meta).`,
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

		const method = legacyMethods[message.method];
		if (!method) return error(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`);
		const params = message.params ?? {};
		if (!isObject(params)) return error(id, INVALID_PARAMS, 'params must be an object');
		return run(method, id, params, context);
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
		return answer(message, request.headers, {
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
	return typeof requested === 'string' && LEGACY_VERSIONS.includes(requested)
		? requested
		: LEGACY_VERSIONS[0];
}

/**
 * The era a request opens: modern when its `params._meta` carries a protocol
 * version (2026-07-28, basic/versioning: "A request carrying modern
 * per-request `_meta` is served statelessly according to this revision").
 * A handshake-based version there is no modern request, so it is served as a
 * legacy one rather than refused for a version we do speak.
 */
function declaredVersion(params: unknown): { modern: boolean; version?: unknown } {
	if (!isObject(params) || !isObject(params._meta) || !(PROTOCOL_VERSION_KEY in params._meta)) {
		return { modern: false };
	}
	const version = params._meta[PROTOCOL_VERSION_KEY];
	if (typeof version === 'string' && LEGACY_VERSIONS.includes(version)) return { modern: false };
	return { modern: true, version };
}

/**
 * Check the headers 2026-07-28 mirrors from the body (transports/streamable-http,
 * Server Validation): each must be present and equal its body value. Returns
 * what is wrong, for a HeaderMismatch error, or `undefined`. We define no
 * `x-mcp-header` parameters, so no `Mcp-Param-*` header is ours to check.
 */
function headerMismatch(
	headers: Headers,
	method: string,
	params: Params,
	version: string
): string | undefined {
	const mirrored: Array<[header: string, body: unknown]> = [
		['MCP-Protocol-Version', version],
		['Mcp-Method', method]
	];
	if (method === 'tools/call') mirrored.push(['Mcp-Name', params.name]);
	for (const [header, body] of mirrored) {
		const sent = headers.get(header);
		if (sent === null) return `Header mismatch: the ${header} header is missing`;
		const value = header === 'Mcp-Name' ? decodeSentinel(sent) : sent;
		if (value !== body) {
			return `Header mismatch: ${header} header value '${sent}' does not match body value '${String(body)}'`;
		}
	}
}

/**
 * Decode a header value in the `=?base64?…?=` sentinel form clients use for
 * values that are not plain ASCII; other values pass through. A malformed
 * encoding gives `undefined`, which matches no body value.
 */
function decodeSentinel(value: string): string | undefined {
	const encoded = /^=\?base64\?(.*)\?=$/.exec(value)?.[1];
	if (encoded === undefined) return value;
	try {
		const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return undefined;
	}
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
