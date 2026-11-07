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
): StandardSchemaV1 & { seen: unknown[] } {
	const seen: unknown[] = [];
	const validate = (value: unknown) => {
		seen.push(value);
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
		seen,
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: async ? (value) => Promise.resolve(validate(value)) : validate
		}
	};
}

const optional = () => undefined;
const required = (value: unknown) => (value === undefined ? 'Required' : undefined);
const messageOf = (promise: Promise<unknown>) =>
	promise.then(
		() => '',
		(err: Error) => err.message
	);

describe('checkFrontmatter', () => {
	it('passes well-formed pages, custom fields included', async () => {
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
		const message = await messageOf(
			checkFrontmatter([
				page(
					'docs/a',
					'title: 2024\norder: "2"\nsection: [Guides, 3]\nlastUpdated: last week\ndescription:'
				)
			])
		);

		expect(message).toBe(
			[
				'[svelte-docsmith] invalid frontmatter in 1 page',
				'  docs/a/+page.md',
				'    title: expected a string, got 2024',
				'    order: expected a number, got "2"',
				'    section: expected a string or a list of strings, got ["Guides",3]',
				'    lastUpdated: expected a YYYY-MM-DD date, got "last week"',
				'    description: expected a string, got null'
			].join('\n')
		);
	});

	it('leaves pages without a frontmatter block alone', async () => {
		const stub = toPage(path.join(process.cwd(), 'docs/stub/+page.md'), '# no frontmatter\n');
		const schema = strict({ draft: required });
		await expect(checkFrontmatter([stub], schema)).resolves.toBeUndefined();
		expect(schema.seen).toEqual([]);
	});

	it('hands the schema only the custom fields, so it never repeats the built-in ones', async () => {
		const schema = strict({ draft: optional });
		await checkFrontmatter([page('docs/a', 'title: A\norder: 1\ndraft: true')], schema);
		expect(schema.seen).toEqual([{ draft: true }]);
	});

	it('reports a typo a strict schema rejects, with the file it is in', async () => {
		const schema = strict({ draft: optional });
		await expect(checkFrontmatter([page('docs/a', 'title: A\nordr: 2')], schema)).rejects.toThrow(
			'  docs/a/+page.md\n    Unrecognized key: "ordr"'
		);
	});

	it('awaits an async schema', async () => {
		const schema = strict({ badge: required }, { async: true });
		await expect(checkFrontmatter([page('docs/a', 'title: A')], schema)).rejects.toThrow(
			'    badge: Required'
		);
	});

	it('reports built-in and schema problems on the same page together', async () => {
		const schema = strict({ draft: (v) => (typeof v === 'boolean' ? undefined : 'Not a boolean') });
		const message = await messageOf(
			checkFrontmatter([page('docs/a', 'title: A\norder: "2"\ndraft: yes please')], schema)
		);
		expect(message).toContain('    order: expected a number, got "2"\n    draft: Not a boolean');
	});

	it('lists every failing page in one error, sorted by file', async () => {
		const message = await messageOf(
			checkFrontmatter([
				page('docs/b', 'order: x'),
				page('docs/ok', 'title: Fine'),
				page('docs/a', 'title: [1]')
			])
		);

		expect(message).toMatch(
			/invalid frontmatter in 2 pages\n {2}docs\/a\/\+page\.md\n.*\n {2}docs\/b\/\+page\.md\n/
		);
		expect(message).not.toContain('docs/ok');
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

	describe('without a schema, a custom key that looks like a built-in one', () => {
		it('is returned as a warning naming the field it was probably meant to be', async () => {
			const warning = await checkFrontmatter([
				page('docs/b', 'title: B\nTitle: again'),
				page('docs/a', 'title: A\nordr: 2\ndraft: true')
			]);

			expect(warning).toBe(
				[
					'[svelte-docsmith] possible frontmatter typos in 2 pages',
					'  docs/a/+page.md',
					'    ordr: did you mean `order`? It is kept as a custom field.',
					'  docs/b/+page.md',
					'    Title: did you mean `title`? It is kept as a custom field.',
					'  Rename the key, or declare it in the `schema` you pass to docsmith().'
				].join('\n')
			);
		});

		it('is not reported once the schema declares it', async () => {
			const schema = strict({ orders: optional });
			await expect(
				checkFrontmatter([page('docs/a', 'title: A\norders: [1]')], schema)
			).resolves.toBeUndefined();
		});

		it('is still reported when a non-strict schema drops it', async () => {
			const schema: StandardSchemaV1 = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: { tags: [] } }) }
			};
			await expect(
				checkFrontmatter([page('docs/a', 'title: A\nordr: 2\ntags: []')], schema)
			).resolves.toMatch(/ordr: did you mean `order`/);
		});

		it('is not an error, so the build goes on', async () => {
			await expect(checkFrontmatter([page('docs/a', 'title: A\nsecton: Guides')])).resolves.toMatch(
				/secton: did you mean `section`/
			);
		});
	});
});
