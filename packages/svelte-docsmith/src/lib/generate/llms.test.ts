import { describe, expect, it } from 'vitest';
import { generateLlmsTxt, generateLlmsFullTxt } from './llms.js';
import type { LlmsDoc } from '$lib/core/content.js';

// Deliberately out of reading order: a later section listed first, and items
// within a section reversed, so the ordering logic has something to fix.
const docs: LlmsDoc[] = [
	{
		path: '/docs/config',
		title: 'Configuration',
		section: 'Guides',
		order: 3,
		description: 'All the knobs',
		content: '# Configuration\n\nTweak everything.'
	},
	{
		path: '/docs/install',
		title: 'Installation',
		section: 'Getting Started',
		order: 2,
		content: '# Installation\n\nRun the installer.'
	},
	{
		path: '/docs/intro',
		title: 'Introduction',
		section: 'Getting Started',
		order: 1,
		description: 'What this is',
		content: '# Introduction\n\nWelcome to the docs.'
	}
];

describe('generateLlmsTxt', () => {
	it('renders the title, description, and sectioned links', () => {
		const txt = generateLlmsTxt(
			{ title: 'My Docs', description: 'Great docs', origin: 'https://x.dev' },
			docs
		);
		expect(txt).toContain('# My Docs');
		expect(txt).toContain('> Great docs');
		expect(txt).toContain('## Getting Started');
		expect(txt).toContain('## Guides');
		expect(txt).toContain('- [Introduction](https://x.dev/docs/intro): What this is');
		expect(txt).toContain('- [Installation](https://x.dev/docs/install)');
		expect(txt).toContain('- [Configuration](https://x.dev/docs/config): All the knobs');
	});

	it('orders sections and items by sidebar order, not input order', () => {
		const txt = generateLlmsTxt({ title: 'My Docs' }, docs);
		const lines = txt.split('\n').filter((l) => l.startsWith('#') || l.startsWith('- '));
		expect(lines).toEqual([
			'# My Docs',
			'## Getting Started',
			'- [Introduction](/docs/intro): What this is',
			'- [Installation](/docs/install)',
			'## Guides',
			'- [Configuration](/docs/config): All the knobs'
		]);
	});

	it('omits the description suffix when a doc has none', () => {
		const txt = generateLlmsTxt({ title: 'My Docs' }, docs);
		const installLine = txt.split('\n').find((l) => l.includes('/docs/install'));
		expect(installLine).toBe('- [Installation](/docs/install)');
	});

	it('groups docs without a section under "Docs"', () => {
		const txt = generateLlmsTxt({ title: 'My Docs' }, [{ path: '/a', title: 'A', content: '# A' }]);
		expect(txt).toContain('## Docs');
	});

	it('trims a trailing slash from the origin and omits the description line when absent', () => {
		const txt = generateLlmsTxt({ title: 'My Docs', origin: 'https://x.dev/' }, docs);
		expect(txt).toContain('](https://x.dev/docs/intro)');
		expect(txt).not.toContain('https://x.dev//docs');
		expect(txt).not.toContain('>');
	});
});

describe('generateLlmsFullTxt', () => {
	it('concatenates the site header and every doc body', () => {
		const txt = generateLlmsFullTxt({ title: 'My Docs', description: 'Great docs' }, docs);
		expect(txt.startsWith('# My Docs\n\n> Great docs')).toBe(true);
		expect(txt).toContain('# Introduction\n\nWelcome to the docs.');
		expect(txt).toContain('# Installation\n\nRun the installer.');
		expect(txt).toContain('# Configuration\n\nTweak everything.');
	});

	it('drops the description line from the header when absent', () => {
		const txt = generateLlmsFullTxt({ title: 'My Docs' }, docs);
		expect(txt.startsWith('# My Docs\n\n# Introduction')).toBe(true);
	});
});
