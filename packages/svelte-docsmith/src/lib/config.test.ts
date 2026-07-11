import { describe, expect, it } from 'vitest';
import { defineConfig, navFromContent, type DocsContentItem } from './config.js';

describe('defineConfig', () => {
	it('returns a valid config unchanged', () => {
		const config = { title: 'My Library', github: 'https://x', version: '1.0.0' };
		expect(defineConfig(config)).toBe(config);
	});

	it('accepts a config with only the required title', () => {
		expect(defineConfig({ title: 'Docs' })).toEqual({ title: 'Docs' });
	});

	it.each([null, undefined, 'string', 42])('throws when config is not an object (%s)', (value) => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig(value)).toThrow(/expects a config object/);
	});

	it.each([{ title: '' }, { title: '   ' }, {}])(
		'throws when title is missing or blank (%o)',
		(value) => {
			// @ts-expect-error — exercising the runtime guard for untyped callers
			expect(() => defineConfig(value)).toThrow(/config\.title is required/);
		}
	);

	it.each(['github', 'version', 'description', 'url', 'ogImage', 'editUrl'] as const)(
		'throws when %s is a non-string',
		(key) => {
			expect(() => defineConfig({ title: 'Docs', [key]: 123 })).toThrow(
				new RegExp(`config\\.${key} must be a string`)
			);
		}
	);

	it('throws when nav is not an array', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', nav: 'links' })).toThrow(
			/config\.nav must be an array/
		);
	});

	it('throws when a nav entry is missing label or href', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', nav: [{ label: 'Docs' }] })
		).toThrow(/each config\.nav entry/);
	});

	it('accepts a valid nav array', () => {
		const config = { title: 'Docs', nav: [{ label: 'Docs', href: '/docs' }] };
		expect(defineConfig(config)).toBe(config);
	});

	it('throws when footer is not an object', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', footer: 'nope' })).toThrow(
			/config\.footer must be an object/
		);
	});

	it('accepts a valid footer object', () => {
		const config = { title: 'Docs', footer: { copyright: '© 2026' } };
		expect(defineConfig(config)).toBe(config);
	});

	it('throws when footer.copyright is a non-string', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', footer: { copyright: 2026 } })).toThrow(
			/config\.footer\.copyright must be a string/
		);
	});

	it('throws when footer.poweredBy is a non-boolean', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', footer: { poweredBy: 'yes' } })).toThrow(
			/config\.footer\.poweredBy must be a boolean/
		);
	});

	it('throws when footer.columns is not an array', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', footer: { columns: {} } })).toThrow(
			/config\.footer\.columns must be an array/
		);
	});

	it('throws when a footer column is missing its title', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', footer: { columns: [{ links: [] }] } })
		).toThrow(/config\.footer\.columns entry needs a string `title`/);
	});

	it('throws when a footer column links field is not an array', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', footer: { columns: [{ title: 'Links', links: 'nope' }] } })
		).toThrow(/column "Links" needs a `links` array/);
	});

	it('throws when a footer column link is missing label or href', () => {
		expect(() =>
			defineConfig({
				title: 'Docs',
				// @ts-expect-error — exercising the runtime guard for untyped callers
				footer: { columns: [{ title: 'Links', links: [{ label: 'Home' }] }] }
			})
		).toThrow(/link in config\.footer column "Links"/);
	});

	it('accepts a fully-populated footer with columns', () => {
		const config = {
			title: 'Docs',
			footer: {
				copyright: '© 2026',
				poweredBy: false,
				columns: [{ title: 'Links', links: [{ label: 'Home', href: '/' }] }]
			}
		};
		expect(defineConfig(config)).toBe(config);
	});
});

describe('navFromContent', () => {
	it('returns an empty array for no content', () => {
		expect(navFromContent([])).toEqual([]);
	});

	it('groups items by section and maps path to url', () => {
		const content: DocsContentItem[] = [
			{ title: 'Intro', path: '/docs/intro', section: 'Guides', order: 1 },
			{ title: 'Setup', path: '/docs/setup', section: 'Guides', order: 2 }
		];
		expect(navFromContent(content)).toEqual([
			{
				title: 'Guides',
				items: [
					{ title: 'Intro', url: '/docs/intro' },
					{ title: 'Setup', url: '/docs/setup' }
				]
			}
		]);
	});

	it('falls back to a "Docs" group when section is missing', () => {
		expect(navFromContent([{ title: 'A', path: '/a' }])).toEqual([
			{ title: 'Docs', items: [{ title: 'A', url: '/a' }] }
		]);
	});

	it('sorts items within a group by order', () => {
		const content: DocsContentItem[] = [
			{ title: 'Third', path: '/c', section: 'G', order: 3 },
			{ title: 'First', path: '/a', section: 'G', order: 1 },
			{ title: 'Second', path: '/b', section: 'G', order: 2 }
		];
		expect(navFromContent(content)[0].items.map((i) => i.title)).toEqual([
			'First',
			'Second',
			'Third'
		]);
	});

	it('orders groups by the smallest order they contain', () => {
		const content: DocsContentItem[] = [
			{ title: 'Ref', path: '/ref', section: 'Reference', order: 5 },
			{ title: 'Intro', path: '/intro', section: 'Getting Started', order: 1 },
			{ title: 'Concept', path: '/concept', section: 'Concepts', order: 3 }
		];
		expect(navFromContent(content).map((g) => g.title)).toEqual([
			'Getting Started',
			'Concepts',
			'Reference'
		]);
	});

	it('treats a missing order as 0', () => {
		const content: DocsContentItem[] = [
			{ title: 'Ordered', path: '/o', section: 'G', order: 2 },
			{ title: 'Unordered', path: '/u', section: 'G' }
		];
		expect(navFromContent(content)[0].items.map((i) => i.title)).toEqual(['Unordered', 'Ordered']);
	});
});
