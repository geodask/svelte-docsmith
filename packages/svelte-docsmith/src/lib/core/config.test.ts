import { describe, expect, it } from 'vitest';
import { checkSite } from './config.js';

describe('checkSite', () => {
	it('returns a valid config unchanged', () => {
		const config = { title: 'My Library', github: 'https://x', version: '1.0.0' };
		expect(checkSite(config)).toBe(config);
	});

	it('accepts a config with only the required title', () => {
		expect(checkSite({ title: 'Docs' })).toEqual({ title: 'Docs' });
	});

	it.each([null, undefined, 'string', 42])('throws when config is not an object (%s)', (value) => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite(value)).toThrow(/needs a `site` object/);
	});

	it.each([{ title: '' }, { title: '   ' }, {}])(
		'throws when title is missing or blank (%o)',
		(value) => {
			// @ts-expect-error — exercising the runtime guard for untyped callers
			expect(() => checkSite(value)).toThrow(/site\.title is required/);
		}
	);

	it.each(['github', 'version', 'description', 'url', 'ogImage', 'editUrl', 'mcp'] as const)(
		'throws when %s is a non-string',
		(key) => {
			expect(() => checkSite({ title: 'Docs', [key]: 123 })).toThrow(
				new RegExp(`site\\.${key} must be a string`)
			);
		}
	);

	it('throws when nav is not an array', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', nav: 'links' })).toThrow(/site\.nav must be an array/);
	});

	it('throws when a nav entry is missing label or href', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', nav: [{ label: 'Docs' }] })
		).toThrow(/each site\.nav entry/);
	});

	it('accepts a valid nav array', () => {
		const config = { title: 'Docs', nav: [{ label: 'Docs', href: '/docs' }] };
		expect(checkSite(config)).toBe(config);
	});

	it('throws when footer is not an object', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', footer: 'nope' })).toThrow(
			/site\.footer must be an object/
		);
	});

	it('accepts a valid footer object', () => {
		const config = { title: 'Docs', footer: { copyright: '© 2026' } };
		expect(checkSite(config)).toBe(config);
	});

	it('throws when footer.copyright is a non-string', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', footer: { copyright: 2026 } })).toThrow(
			/site\.footer\.copyright must be a string/
		);
	});

	it('throws when footer.poweredBy is a non-boolean', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', footer: { poweredBy: 'yes' } })).toThrow(
			/site\.footer\.poweredBy must be a boolean/
		);
	});

	it('throws when footer.columns is not an array', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', footer: { columns: {} } })).toThrow(
			/site\.footer\.columns must be an array/
		);
	});

	it('throws when a footer column is missing its title', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', footer: { columns: [{ links: [] }] } })
		).toThrow(/site\.footer\.columns entry needs a string `title`/);
	});

	it('throws when a footer column links field is not an array', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', footer: { columns: [{ title: 'Links', links: 'nope' }] } })
		).toThrow(/column "Links" needs a `links` array/);
	});

	it('throws when a footer column link is missing label or href', () => {
		expect(() =>
			checkSite({
				title: 'Docs',
				// @ts-expect-error — exercising the runtime guard for untyped callers
				footer: { columns: [{ title: 'Links', links: [{ label: 'Home' }] }] }
			})
		).toThrow(/link in site\.footer column "Links"/);
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
		expect(checkSite(config)).toBe(config);
	});

	it('throws when announcement is not an object', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', announcement: 'nope' })).toThrow(
			/site\.announcement must be an object/
		);
	});

	it('throws when announcement.text is missing or blank', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite({ title: 'Docs', announcement: { href: '/x' } })).toThrow(
			/site\.announcement\.text is required/
		);
		expect(() => checkSite({ title: 'Docs', announcement: { text: '  ' } })).toThrow(
			/site\.announcement\.text is required/
		);
	});

	it('throws when announcement.href is a non-string', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', announcement: { text: 'Hi', href: 42 } })
		).toThrow(/site\.announcement\.href must be a string/);
	});

	it('throws when announcement.dismissible is a non-boolean', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', announcement: { text: 'Hi', dismissible: 'no' } })
		).toThrow(/site\.announcement\.dismissible must be a boolean/);
	});

	it('throws when announcement.tag is a non-string', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			checkSite({ title: 'Docs', announcement: { text: 'Hi', tag: 1 } })
		).toThrow(/site\.announcement\.tag must be a string/);
	});

	it('accepts a valid announcement', () => {
		const config = {
			title: 'Docs',
			announcement: { text: 'v1 is out', tag: 'New', href: '/blog/v1', external: true, id: 'v1' }
		};
		expect(checkSite(config)).toBe(config);
	});

	it.each([
		[{ title: 'Docs', version: () => '1.0' }, /site\.version must be a string/],
		[
			{ title: 'Docs', footer: { copyright: 'x', extra: new Date(0) } },
			/site\.footer\.extra is a Date/
		],
		[{ title: 'Docs', custom: [1, Number.NaN] }, /site\.custom\[1\] is a number/],
		[{ title: 'Docs', custom: new Map() }, /site\.custom is a Map/]
	])('rejects what JSON would change on the way to the browser (%#)', (value, error) => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => checkSite(value)).toThrow(error);
	});

	it('accepts plain data, nulls, and unset (undefined) keys', () => {
		const site = {
			title: 'Docs',
			url: undefined,
			custom: { n: 1, ok: true, none: null, list: ['a'] }
		};
		expect(checkSite(site)).toBe(site);
	});
});
