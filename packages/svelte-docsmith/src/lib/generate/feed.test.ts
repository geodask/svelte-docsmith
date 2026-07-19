import { describe, expect, it } from 'vitest';
import { generateFeed } from './feed.js';
import type { ChangelogRelease } from '../core/changelog.js';

const release = (over: Partial<ChangelogRelease> = {}): ChangelogRelease => ({
	version: '1.0.0',
	date: '2026-07-01T00:00:00.000Z',
	groups: [{ kind: 'Minor Changes', items: ['Added a thing.'] }],
	...over
});

const site = { url: 'https://docs.example.com', title: 'Example' };

describe('generateFeed', () => {
	it('produces a well-formed Atom document', () => {
		const xml = generateFeed([release()], site);
		expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
		expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
		expect(xml.trimEnd().endsWith('</feed>')).toBe(true);
		expect(xml).toContain('<title>Example</title>');
	});

	it('links a release to its anchor on the changelog page', () => {
		const xml = generateFeed([release({ version: '1.2.3' })], site);
		expect(xml).toContain('href="https://docs.example.com/changelog#1.2.3"');
	});

	it('prefers a hand-written page when a release has one', () => {
		const xml = generateFeed([release({ path: '/changelog/1-0-0' })], site);
		expect(xml).toContain('href="https://docs.example.com/changelog/1-0-0"');
	});

	it('escapes XML in titles and content', () => {
		const xml = generateFeed(
			[release({ groups: [{ kind: 'Minor', items: ['Use <Tabs> & "quotes"'] }] })],
			{ ...site, title: 'A & B' }
		);
		expect(xml).toContain('<title>A &amp; B</title>');
		expect(xml).toContain('&lt;Tabs&gt;');
		expect(xml).toContain('&amp;');
		expect(xml).not.toMatch(/<content type="text">[^<]*<Tabs>/);
	});

	it('trims a trailing slash from the origin so links are not doubled', () => {
		const xml = generateFeed([release()], { ...site, url: 'https://docs.example.com/' });
		expect(xml).not.toContain('//changelog');
	});

	it('honours a custom changelog path', () => {
		const xml = generateFeed([release()], { ...site, path: '/releases' });
		expect(xml).toContain('href="https://docs.example.com/releases.xml"');
	});

	it('stays valid when no release carries a date', () => {
		const xml = generateFeed([release({ date: undefined })], site);
		expect(xml).toMatch(/<updated>\d{4}-\d{2}-\d{2}T/);
	});

	it('emits a feed with no entries rather than failing on an empty changelog', () => {
		const xml = generateFeed([], site);
		expect(xml).toContain('</feed>');
		expect(xml).not.toContain('<entry>');
	});
});
