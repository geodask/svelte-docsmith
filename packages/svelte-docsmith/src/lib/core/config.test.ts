import { describe, expect, it } from 'vitest';
import { defineConfig } from './config.js';

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

	it('throws when announcement is not an object', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', announcement: 'nope' })).toThrow(
			/config\.announcement must be an object/
		);
	});

	it('throws when announcement.text is missing or blank', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => defineConfig({ title: 'Docs', announcement: { href: '/x' } })).toThrow(
			/config\.announcement\.text is required/
		);
		expect(() => defineConfig({ title: 'Docs', announcement: { text: '  ' } })).toThrow(
			/config\.announcement\.text is required/
		);
	});

	it('throws when announcement.href is a non-string', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', announcement: { text: 'Hi', href: 42 } })
		).toThrow(/config\.announcement\.href must be a string/);
	});

	it('throws when announcement.dismissible is a non-boolean', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', announcement: { text: 'Hi', dismissible: 'no' } })
		).toThrow(/config\.announcement\.dismissible must be a boolean/);
	});

	it('throws when announcement.tag is a non-string', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			defineConfig({ title: 'Docs', announcement: { text: 'Hi', tag: 1 } })
		).toThrow(/config\.announcement\.tag must be a string/);
	});

	it('accepts a valid announcement', () => {
		const config = {
			title: 'Docs',
			announcement: { text: 'v1 is out', tag: 'New', href: '/blog/v1', external: true, id: 'v1' }
		};
		expect(defineConfig(config)).toBe(config);
	});
});
