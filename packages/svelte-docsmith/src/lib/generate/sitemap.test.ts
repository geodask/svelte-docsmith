import { describe, expect, it } from 'vitest';
import { generateSitemap } from './sitemap.js';

describe('generateSitemap', () => {
	it('wraps entries in a urlset with absolute locs', () => {
		const xml = generateSitemap('https://x.dev', [{ path: '/' }, { path: '/docs/intro' }]);
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<loc>https://x.dev/</loc>');
		expect(xml).toContain('<loc>https://x.dev/docs/intro</loc>');
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
	});

	it('emits only the date part of lastmod, and omits it when absent', () => {
		const xml = generateSitemap('https://x.dev', [
			{ path: '/a', lastmod: '2026-07-05T20:51:02+03:00' },
			{ path: '/b' }
		]);
		expect(xml).toContain('<lastmod>2026-07-05</lastmod>');
		// The entry without lastmod has no <lastmod> tag.
		const bBlock = xml.slice(xml.indexOf('/b</loc>'));
		expect(bBlock).not.toContain('<lastmod>');
	});

	it('trims a trailing slash on the origin', () => {
		const xml = generateSitemap('https://x.dev/', [{ path: '/a' }]);
		expect(xml).toContain('<loc>https://x.dev/a</loc>');
		expect(xml).not.toContain('https://x.dev//');
	});

	it('escapes every XML-special character in the loc', () => {
		const xml = generateSitemap('https://x.dev', [{ path: `/a&b<c>d'e"f` }]);
		expect(xml).toContain('/a&amp;b&lt;c&gt;d&apos;e&quot;f');
	});
});
