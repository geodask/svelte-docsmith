/**
 * Checking each page's frontmatter before any index is built from it. The
 * indexes drop a built-in field of the wrong type rather than carry it, and an
 * unknown key is just a custom field, so without this a typo like `ordr: 2` or
 * `order: "2"` builds fine and only shows up as a page in the wrong place.
 *
 * Two layers, both reported together so one build lists every problem:
 *
 *  1. The fields svelte-docsmith reads (`title`, `description`, `section`,
 *     `order`, `lastUpdated`) are always checked for the type the indexes
 *     expect, whenever a page sets them.
 *  2. An optional author schema, any Standard Schema (Zod, Valibot, ArkType…),
 *     checks everything else: required extras, or a strict object that rejects
 *     unknown keys.
 *
 * The schema validates and nothing more. Its output is not used, so transforms
 * and defaults do not reach the indexes: mdsvex hands the page its raw YAML at
 * render time, and an index built from a different value would disagree with it.
 */
import path from 'node:path';
import { splitFrontmatter } from '../markdown-source.js';
import type { SourcePage } from './pages.js';

/**
 * The Standard Schema interface (https://standardschema.dev), inlined as the
 * spec recommends so no validation library becomes a dependency. Zod 3.24+,
 * Valibot 1+ and ArkType 2+ schemas all satisfy it.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown
		) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
		readonly types?: { readonly input: Input; readonly output: Output } | undefined;
	};
}

type StandardSchemaResult<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| { readonly issues: ReadonlyArray<StandardSchemaIssue> };

type StandardSchemaIssue = {
	readonly message: string;
	readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
};

/** One problem with one page's frontmatter, at a field path (`''` for the whole block). */
type Issue = { path: string; message: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isString = (value: unknown): value is string => typeof value === 'string';

/** The built-in fields, each with the check the indexes rely on and how to say it failed. */
const BUILTIN_FIELDS: [key: string, ok: (value: unknown) => boolean, expected: string][] = [
	['title', isString, 'a string'],
	['description', isString, 'a string'],
	[
		'section',
		(v) => isString(v) || (Array.isArray(v) && v.length > 0 && v.every(isString)),
		'a string or a list of strings'
	],
	['order', (v) => typeof v === 'number' && Number.isFinite(v), 'a number'],
	['lastUpdated', (v) => isString(v) && DAY.test(v), 'a YYYY-MM-DD date']
];

/** The frontmatter keys svelte-docsmith reads itself; every other key is the author's own. */
export const BUILTIN_KEYS: ReadonlySet<string> = new Set(BUILTIN_FIELDS.map(([key]) => key));

function builtinIssues(frontmatter: Record<string, unknown>): Issue[] {
	const issues: Issue[] = [];
	for (const [key, ok, expected] of BUILTIN_FIELDS) {
		if (!(key in frontmatter) || ok(frontmatter[key])) continue;
		issues.push({ path: key, message: `expected ${expected}, got ${shown(frontmatter[key])}` });
	}
	return issues;
}

/** A value as the author would recognise it, short enough for one error line. */
function shown(value: unknown): string {
	const text = JSON.stringify(value) ?? String(value);
	return text.length > 40 ? `${text.slice(0, 37)}...` : text;
}

/** `['section', 1]` → `section[1]`, the way the author would point at it. */
function pathOf(issue: StandardSchemaIssue): string {
	let out = '';
	for (const segment of issue.path ?? []) {
		const key = typeof segment === 'object' ? segment.key : segment;
		out += typeof key === 'number' ? `[${key}]` : `${out ? '.' : ''}${String(key)}`;
	}
	return out;
}

async function schemaIssues(
	frontmatter: Record<string, unknown>,
	schema: StandardSchemaV1
): Promise<Issue[]> {
	const result = await schema['~standard'].validate(frontmatter);
	return (result.issues ?? []).map((issue) => ({ path: pathOf(issue), message: issue.message }));
}

/**
 * Check every page that has a frontmatter block, and throw one error listing
 * each page's problems. A page with no block is left alone: it is a stub the
 * indexes skip, not something the author configured.
 *
 * Where the schema and a built-in check both flag a field, only the schema's
 * message is kept, since the author wrote it.
 */
export async function checkFrontmatter(
	pages: SourcePage[],
	schema?: StandardSchemaV1
): Promise<void> {
	const problems: { file: string; issues: Issue[] }[] = [];

	for (const page of pages) {
		if (splitFrontmatter(page.source).frontmatter === undefined) continue;
		const fromSchema = schema ? await schemaIssues(page.frontmatter, schema) : [];
		const flagged = new Set(fromSchema.map((issue) => issue.path));
		const issues = [
			...builtinIssues(page.frontmatter).filter((issue) => !flagged.has(issue.path)),
			...fromSchema
		];
		if (issues.length) problems.push({ file: page.file, issues });
	}

	if (!problems.length) return;
	problems.sort((a, b) => a.file.localeCompare(b.file));
	const count = problems.length === 1 ? '1 page' : `${problems.length} pages`;
	const lines = problems.flatMap(({ file, issues }) => [
		`  ${path.relative(process.cwd(), file).split(path.sep).join('/')}`,
		...issues.map((issue) => `    ${issue.path ? `${issue.path}: ` : ''}${issue.message}`)
	]);
	throw new Error(`[svelte-docsmith] invalid frontmatter in ${count}\n${lines.join('\n')}`);
}
