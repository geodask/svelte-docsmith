/**
 * Checking each page's frontmatter before any index is built from it. The
 * indexes drop a built-in field they cannot read, and any other key is kept as
 * a custom field, so without this `order: "2"` or a typo like `ordr: 2` builds
 * fine and only shows up as a page in the wrong place.
 *
 * Three checks, reported together so one build lists every problem:
 *
 *  1. Every built-in field a page sets must pass its reader in `./fields.js`,
 *     the same reader the indexes use. A failure is an error.
 *  2. An optional author schema, any Standard Schema (Zod, Valibot, ArkType…),
 *     checks the custom fields, and only those: the built-in fields are already
 *     covered, so a strict schema lists just the author's own keys. A failure is
 *     an error.
 *  3. A custom key one edit away from a built-in one (`ordr`, `Title`) is
 *     reported as a likely typo. Only a warning: it may be a real custom field,
 *     and a strict schema is how an author makes it an error.
 *
 * The schema validates and nothing more. Its output is not used, so transforms
 * and defaults do not reach `data`: mdsvex hands the page its raw YAML at
 * render time, and an index built from a different value would disagree with it.
 */
import { relativeToCwd } from '../paths.js';
import { customFields, invalidFields, likelyTypoOf } from './fields.js';
import type { SourcePage } from './pages.js';

/**
 * The Standard Schema interface (https://standardschema.dev), copied whole as
 * the spec asks, so no validation library becomes a dependency. Zod 3.24+,
 * Valibot 1+ and ArkType 2+ schemas all satisfy it. Only `validate` is called;
 * `types` is what each library's own infer helper reads.
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
type FieldProblem = { path: string; message: string };

/** A page's problems, under the path an author would open. */
type PageReport = { file: string; lines: string[] };

/** A value as the author would recognise it, short enough for one error line. */
function preview(value: unknown): string {
	const text = JSON.stringify(value) ?? String(value);
	return text.length > 40 ? `${text.slice(0, 37)}...` : text;
}

/** `['tags', 1]` → `tags[1]`, the way the author would point at it. */
function pathOf(issue: StandardSchemaIssue): string {
	let out = '';
	for (const segment of issue.path ?? []) {
		const key = typeof segment === 'object' ? segment.key : segment;
		out += typeof key === 'number' ? `[${key}]` : `${out ? '.' : ''}${String(key)}`;
	}
	return out;
}

function builtinProblems(frontmatter: Record<string, unknown>): FieldProblem[] {
	return invalidFields(frontmatter).map(({ key, expected }) => ({
		path: key,
		message: `expected ${expected}, got ${preview(frontmatter[key])}`
	}));
}

async function schemaProblems(
	fields: Record<string, unknown>,
	schema: StandardSchemaV1
): Promise<FieldProblem[]> {
	const result = await schema['~standard'].validate(fields);
	return (result.issues ?? []).map((issue) => ({ path: pathOf(issue), message: issue.message }));
}

function typoLines(fields: Record<string, unknown>): string[] {
	return Object.keys(fields).flatMap((key) => {
		const meant = likelyTypoOf(key);
		return meant ? [`${key}: did you mean \`${meant}\`? It is kept as a custom field.`] : [];
	});
}

/** Pages sorted by path, each indented under its path: the shape both reports share. */
function formatReports(reports: PageReport[]): string {
	return reports
		.sort((a, b) => a.file.localeCompare(b.file))
		.flatMap(({ file, lines }) => [`  ${relativeToCwd(file)}`, ...lines.map((l) => `    ${l}`)])
		.join('\n');
}

const pagesCount = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

/**
 * Check every page that has a frontmatter block. Throws one error listing each
 * page's problems; otherwise returns a warning about likely typos, if there
 * are any. A page with no block is left alone: it is a stub the indexes skip,
 * not something the author configured.
 */
export async function checkFrontmatter(
	pages: SourcePage[],
	schema?: StandardSchemaV1
): Promise<string | undefined> {
	const errors: PageReport[] = [];
	const typos: PageReport[] = [];

	for (const page of pages) {
		if (!page.hasFrontmatter) continue;
		const fields = customFields(page.frontmatter);
		const problems = [
			...builtinProblems(page.frontmatter),
			...(schema ? await schemaProblems(fields, schema) : [])
		];
		if (problems.length) {
			const lines = problems.map((p) => (p.path ? `${p.path}: ${p.message}` : p.message));
			errors.push({ file: page.file, lines });
		}
		const typoed = typoLines(fields);
		if (typoed.length) typos.push({ file: page.file, lines: typoed });
	}

	if (errors.length) {
		throw new Error(
			`[svelte-docsmith] invalid frontmatter in ${pagesCount(errors.length)}\n${formatReports(errors)}`
		);
	}
	if (typos.length) {
		return (
			`[svelte-docsmith] possible frontmatter typos in ${pagesCount(typos.length)}\n` +
			`${formatReports(typos)}\n` +
			`  Rename the key, or pass a strict \`schema\` to docsmith() to declare your custom fields.`
		);
	}
}
