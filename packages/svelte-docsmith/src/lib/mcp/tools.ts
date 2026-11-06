/**
 * The MCP server's tools. Each tool is declarative data (name, description,
 * JSON Schema input) plus a `call` that turns validated arguments into a text
 * result. `tools/list` and `tools/call` in `handler.ts` read this registry, so
 * adding a tool means adding an entry to {@link tools}.
 */
import type { LlmsDoc } from '#lib/core/content.js';
import { currentVersion, scopeContent, type ResolvedVersion } from '#lib/core/version.js';
import { bySection, type LlmsSite } from '#lib/generate/llms.js';
import type { SearchEngine } from '#lib/search/create-search.js';
import { join, normalizePath } from '../utils/url.js';

/** What every tool call can read: the handler's indexes and the request URL. */
export type ToolContext = {
	site: LlmsSite;
	docs: LlmsDoc[];
	/** The search engine over the search index, built on first call, once per handler. */
	searchEngine(): SearchEngine;
	versions: ResolvedVersion[];
	/**
	 * The version this call reads: the current one unless the call asked for
	 * another. `undefined` on an unversioned site, where nothing is scoped.
	 */
	version?: string;
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
 * ignored. Returns what is wrong, for an `isError` tool result the model can
 * act on, or `undefined`.
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

/**
 * The `version` argument every tool takes. A versioned site's tools read the
 * current version unless the call names another; an unversioned site ignores it.
 */
const VERSION_ARG = {
	type: 'string',
	description:
		'The id of the docs version to read, for a release other than the current one. ' +
		'Defaults to the current version. Ignored when the docs are not versioned.'
} as const;

/**
 * The version a call reads, from its `version` argument: the named version, or
 * the current one when none is named (as `currentOnly` scopes llms.txt). On an
 * unversioned site the argument is ignored and `version` is `undefined`, so
 * nothing gets scoped. An id the site doesn't declare is a `problem` listing
 * the ones it does.
 */
export function resolveVersion(
	requested: string | undefined,
	versions: ResolvedVersion[]
): { version?: string; problem?: undefined } | { version?: undefined; problem: string } {
	if (versions.length === 0) return {};
	if (requested === undefined) return { version: currentVersion(versions)?.id };
	if (versions.some((v) => v.id === requested)) return { version: requested };
	return { problem: `unknown version "${requested}". Valid versions: ${versionIds(versions)}` };
}

/** The site's version ids for an agent to pick from, e.g. `v2 (current), v1`. */
export const versionIds = (versions: ResolvedVersion[]) =>
	versions.map((v) => (v.current ? `${v.id} (current)` : v.id)).join(', ');

/** A text result, flagged `isError` for a failure the agent can recover from. */
export const text = (value: string, isError = false): ToolResult => ({
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
			},
			version: VERSION_ARG
		},
		required: ['path']
	},
	call(args, context) {
		const requested = args.path as string;
		const path = pagePath(requested, context);
		const doc = path === undefined ? undefined : context.docs.find((d) => d.path === path);
		const { version } = context;
		if (doc && version && doc.version !== version) {
			// Each version's pages have their own paths, so this is an agent holding a
			// link from another version (e.g. a search_docs hit read with `version`).
			return text(
				`"${requested}" is a page of version "${doc.version}", not of version "${version}" ` +
					`that this call reads. Call get_page again with version "${doc.version}" to read it.`,
				true
			);
		}
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
		const origins = [endpoint.origin, originOf(site.origin)];
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

/** A URL's origin, or `undefined` when there is no URL or it is malformed. */
function originOf(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		return new URL(url).origin;
	} catch {
		return undefined;
	}
}

const listPages: Tool = {
	name: 'list_pages',
	title: 'List the docs pages',
	description:
		'List every documentation page in sidebar reading order, grouped by section, with ' +
		'its title, path and description. Use it to browse when search_docs misses, then ' +
		'read a page with get_page.',
	inputSchema: { type: 'object', properties: { version: VERSION_ARG } },
	call(_, { site, docs, version }) {
		const sections = bySection(scopeContent(docs, version)).map(([section, items]) =>
			[
				`## ${section}`,
				'',
				...items.map((doc) => {
					const suffix = doc.description ? `: ${doc.description}` : '';
					return `- [${doc.title}](${link(site, doc.path)})${suffix}`;
				})
			].join('\n')
		);
		return text(sections.join('\n\n'));
	}
};

/** A page path as an agent should see it: absolute when the site has an origin. */
const link = (site: LlmsSite, path: string) => join(site.origin ?? '', path);

/** `search_docs` hits by default, and the most an agent can ask for. */
const SEARCH_LIMIT = 8;
const SEARCH_LIMIT_MAX = 20;

const searchDocs: Tool = {
	name: 'search_docs',
	title: 'Search the docs',
	description:
		'Search the documentation by keywords. Returns the best-matching pages, ranked, each ' +
		'with its title, path, section and a snippet of the matching text. Read a hit in full ' +
		'with get_page.',
	inputSchema: {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'Keywords to search for, such as `dark mode`.' },
			limit: {
				type: 'integer',
				description: `How many hits to return. Default ${SEARCH_LIMIT}, at most ${SEARCH_LIMIT_MAX}.`
			},
			version: VERSION_ARG
		},
		required: ['query']
	},
	call(args, { site, searchEngine, version }) {
		const query = (args.query as string).trim();
		if (!query) return text('search_docs: argument "query" must not be empty', true);
		const requested = (args.limit as number | undefined) ?? SEARCH_LIMIT;
		const limit = Math.min(Math.max(requested, 1), SEARCH_LIMIT_MAX);
		const hits = searchEngine().search(query, limit, version);
		if (hits.length === 0) {
			return text(
				`No pages match "${query}". Try other or fewer words, or list_pages to browse every page.`
			);
		}
		const lines = hits.map((hit, i) => {
			const section = hit.section ? ` (${hit.section})` : '';
			return `${i + 1}. [${hit.title}](${link(site, hit.path)})${section}\n   ${hit.snippet}`;
		});
		return text(lines.join('\n\n'));
	}
};

/** Every tool the server offers, in the order `tools/list` returns them. */
export const tools: Tool[] = [listPages, searchDocs, getPage];
