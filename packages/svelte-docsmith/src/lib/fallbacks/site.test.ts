import { describe, expect, it } from 'vitest';
import { outside, site } from './site.js';

// What `svelte-docsmith/site` serves when the docsmith() plugin is missing.
describe('svelte-docsmith/site without the plugin', () => {
	it('throws the missing-plugin error when the site config is read', () => {
		expect(() => site.title).toThrow(/requires the docsmith\(\) plugin/);
	});

	// AnnouncementBar and the header and footer links read the outside paths
	// as they render; without the plugin no path is outside, and nothing throws.
	it('declares no outside paths', () => {
		expect(outside).toEqual([]);
	});
});
