/**
 * The MCP server's tools. Each tool is declarative data (name, description,
 * JSON Schema input) plus a `call` that turns validated arguments into a text
 * result. `tools/list` and `tools/call` in `handler.ts` read this registry, so
 * adding a tool means adding an entry to {@link tools}.
 */
import type { LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { ResolvedVersion } from '#lib/core/version.js';
import type { LlmsSite } from '#lib/generate/llms.js';
import { normalizePath } from '../utils/url.js';

/** What every tool call can read: the handler's indexes and the request URL. */
export type ToolContext = {
	site: LlmsSite;
	docs: LlmsDoc[];
	search: SearchDoc[];
	versions: ResolvedVersion[];
	/** The URL the MCP request was sent to. */
	endpoint: URL;
};

/** A tool's result: text an agent can read directly. */
export type ToolResult = {
	content: Array<{ type: 'text'; text: string }>;
	/** A tool-level failure the agent can recover from (e.g. a page miss). */
	isError?: boolean;
};

/**
 * The JSON Schema subset our tool inputs use: a flat object of primitive
 * properties. {@link checkArguments} validates exactly this subset, so a tool's
 * schema is both what `tools/list` advertises and what `tools/call` enforces.
 */
export type InputSchema = {
	type: 'object';
	properties: Record<string, { type: 'string' | 'integer'; description: string }>;
	required?: string[];
};

export type Tool = {
	name: string;
	title: string;
	description: string;
	inputSchema: InputSchema;
	call(args: Record<string, unknown>, context: ToolContext): ToolResult;
};

/**
 * Check `args` against a tool's {@link InputSchema}: every required property
 * present, every known property of its declared type. Unknown properties are
 * ignored. Returns what is wrong, for an invalid-params error, or `undefined`.
 */
export function checkArguments(
	schema: InputSchema,
	args: Record<string, unknown>
): string | undefined {
	for (const name of schema.required ?? []) {
		if (args[name] === undefined) return `missing required argument "${name}"`;
	}
	for (const [name, { type }] of Object.entries(schema.properties)) {
		const value = args[name];
		if (value === undefined) continue;
		const ok = type === 'integer' ? Number.isInteger(value) : typeof value === type;
		if (!ok) return `argument "${name}" must be ${type === 'integer' ? 'an' : 'a'} ${type}`;
	}
	return undefined;
}

const text = (value: string, isError = false): ToolResult => ({
	content: [{ type: 'text', text: value }],
	...(isError ? { isError: true } : {})
});

const getPage: Tool = {
	name: 'get_page',
	title: 'Read a docs page',
	description:
		"Read one documentation page in full, as markdown, including its components' props " +
		'tables and example code. Pass the page path (e.g. `/docs/introduction`) or a full URL ' +
		'on the docs site.',
	inputSchema: {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description:
					'The page path, such as `/docs/introduction`, or a full URL on the docs site. ' +
					'A trailing `.md` or slash is fine.'
			}
		},
		required: ['path']
	},
	call(args, context) {
		const requested = args.path as string;
		const path = pagePath(requested, context);
		const doc = path === undefined ? undefined : context.docs.find((d) => d.path === path);
		if (!doc) {
			return text(
				`No page found at "${requested}". Use search_docs to find pages by topic, ` +
					'or list_pages to see every page and its path.',
				true
			);
		}
		return text(doc.content);
	}
};

/**
 * Reduce whatever link an agent holds to a page path as the llms index keys it:
 * a full URL on the site's origin (or the origin the request came to) loses its
 * origin, query and hash; a trailing `.md` (the page's markdown twin) or slash
 * goes; a missing leading slash is added. `undefined` for a URL on any other
 * origin, which can't be one of our pages.
 */
function pagePath(input: string, { site, endpoint }: ToolContext): string | undefined {
	let path = input.trim();
	if (/^[a-z][a-z\d+.-]*:/i.test(path)) {
		let url: URL;
		try {
			url = new URL(path);
		} catch {
			return undefined;
		}
		const origins = [endpoint.origin, site.origin && new URL(site.origin).origin];
		if (!origins.includes(url.origin)) return undefined;
		path = url.pathname;
	}
	path = path.replace(/[?#].*$/, '');
	try {
		path = decodeURI(path);
	} catch {
		// Not percent-encoded after all; match it as written.
	}
	path = normalizePath(path).replace(/\.md$/, '');
	return normalizePath(path.startsWith('/') ? path : `/${path}`);
}

/** Every tool the server offers, in the order `tools/list` returns them. */
export const tools: Tool[] = [getPage];
