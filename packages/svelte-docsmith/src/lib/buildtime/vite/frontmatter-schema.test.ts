import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkFrontmatter, type StandardSchemaV1 } from './frontmatter-schema.js';
import { toPage } from './pages.js';

const page = (dir: string, frontmatter: string) =>
	toPage(path.join(process.cwd(), dir, '+page.md'), `---\n${frontmatter}\n---\n\n# body\n`);

/**
 * A strict object schema written straight against the Standard Schema
 * interface, the way Zod's `z.strictObject` behaves: every key must be listed,
 * and each listed key must pass its check.
 */
function strict(
	fields: Record<string, (value: unknown) => string | undefined>,
	{ async = false } = {}
): StandardSchemaV1 {
	const validate = (value: unknown) => {
		const data = value as Record<string, unknown>;
		const issues: { message: string; path?: PropertyKey[] }[] = [];
		for (const key of Object.keys(data)) {
			if (!(key in fields)) issues.push({ message: `Unrecognized key: "${key}"` });
		}
		for (const [key, check] of Object.entries(fields)) {
			const message = check(data[key]);
			if (message) issues.push({ message, path: [key] });
		}
		return issues.length ? { issues } : { value: data };
	};
	return {
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: async ? (value) => Promise.resolve(validate(value)) : validate
		}
	};
}

const optional = () => undefined;
const required = (value: unknown) => (value === undefined ? 'Required' : undefined);

describe('checkFrontmatter', () => {
	it('passes well-formed pages', async () => {
		await expect(
			checkFrontmatter([
				page(
					'docs/a',
					"title: A\ndescription: d\nsection: [Guides, Advanced]\norder: 2\nlastUpdated: '2026-01-02'"
				),
				page('docs/b', 'title: B\nsection: Guides\ncustom: anything')
			])
		).resolves.toBeUndefined();
	});

	it('type-checks the built-in fields without a schema', async () => {
		const error = await checkFrontmatter([
			page(
				'docs/a',
				'title: 2024\norder: "2"\nsection: [Guides, 3]\nlastUpdated: last week\ndescription:'
			)
		]).catch((err: Error) => err);

		expect((error as Error).message).toBe(
			[
				'[svelte-docsmith] invalid frontmatter in 1 page',
				'  docs/a/+page.md',
				'    title: expected a string, got 2024',
				'    description: expected a string, got null',
				'    section: expected a string or a list of strings, got ["Guides",3]',
				'    order: expected a number, got "2"',
				'    lastUpdated: expected a YYYY-MM-DD date, got "last week"'
			].join('\n')
		);
	});

	it('leaves pages without a frontmatter block alone', async () => {
		const stub = toPage(path.join(process.cwd(), 'docs/stub/+page.md'), '# no frontmatter\n');
		const schema = strict({ title: required });
		await expect(checkFrontmatter([stub], schema)).resolves.toBeUndefined();
	});

	it('reports a typo a strict schema rejects, with the file it is in', async () => {
		const schema = strict({ title: required, order: optional });
		await expect(checkFrontmatter([page('docs/a', 'title: A\nordr: 2')], schema)).rejects.toThrow(
			'  docs/a/+page.md\n    Unrecognized key: "ordr"'
		);
	});

	it('awaits an async schema', async () => {
		const schema = strict({ title: required }, { async: true });
		await expect(checkFrontmatter([page('docs/a', 'order: 1')], schema)).rejects.toThrow(
			/Unrecognized key: "order"\n {4}title: Required/
		);
	});

	it("keeps the schema's message over the built-in one for the same field", async () => {
		const schema = strict({
			title: optional,
			order: (v) => (typeof v === 'number' ? undefined : 'order must be a number')
		});
		const error = await checkFrontmatter([page('docs/a', 'title: A\norder: "2"')], schema).catch(
			(err: Error) => err
		);
		expect((error as Error).message).toContain('order: order must be a number');
		expect((error as Error).message).not.toContain('expected a number');
	});

	it('lists every failing page in one error, sorted by file', async () => {
		const error = await checkFrontmatter([
			page('docs/b', 'order: x'),
			page('docs/ok', 'title: Fine'),
			page('docs/a', 'title: [1]')
		]).catch((err: Error) => err);

		expect((error as Error).message).toMatch(
			/invalid frontmatter in 2 pages\n {2}docs\/a\/\+page\.md\n.*\n {2}docs\/b\/\+page\.md\n/
		);
		expect((error as Error).message).not.toContain('docs/ok');
	});

	it('formats nested issue paths the way the author would point at them', async () => {
		const schema: StandardSchemaV1 = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: () => ({
					issues: [{ message: 'Expected string', path: ['authors', 1, { key: 'name' }] }]
				})
			}
		};
		await expect(checkFrontmatter([page('docs/a', 'title: A')], schema)).rejects.toThrow(
			'    authors[1].name: Expected string'
		);
	});
});
