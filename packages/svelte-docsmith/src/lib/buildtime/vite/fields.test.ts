import { describe, expect, it } from 'vitest';
import { customFields, invalidFields, likelyTypoOf, readField } from './fields.js';

describe('readField', () => {
	it('returns a built-in field only when its reader accepts it', () => {
		const front = {
			title: 'T',
			order: 2,
			section: ['Guides', 'Advanced'],
			lastUpdated: '2026-01-02'
		};
		expect(readField(front, 'title')).toBe('T');
		expect(readField(front, 'order')).toBe(2);
		expect(readField(front, 'section')).toEqual(['Guides', 'Advanced']);
		expect(readField(front, 'lastUpdated')).toBe('2026-01-02');
		expect(readField(front, 'description')).toBeUndefined();
	});

	// The same rules the check reports on: a value the check rejects is one the
	// indexes drop, never one they half-keep.
	it('rejects what the check rejects', () => {
		expect(readField({ order: Infinity }, 'order')).toBeUndefined();
		expect(readField({ order: '2' }, 'order')).toBeUndefined();
		expect(readField({ section: ['Guides', 3] }, 'section')).toBeUndefined();
		expect(readField({ section: [] }, 'section')).toBeUndefined();
		expect(readField({ lastUpdated: 'last week' }, 'lastUpdated')).toBeUndefined();
		expect(readField({ since: '' }, 'since')).toBeUndefined();
		expect(readField({ since: ['0.15'] }, 'since')).toBeUndefined();
	});

	it('reads since as text, whether YAML gave a string or a number', () => {
		expect(readField({ since: '0.15' }, 'since')).toBe('0.15');
		expect(readField({ since: ' v1.2.0 ' }, 'since')).toBe('v1.2.0');
		// `since: 0.15` unquoted.
		expect(readField({ since: 0.15 }, 'since')).toBe('0.15');
		expect(readField({ since: 2 }, 'since')).toBe('2');
	});
});

describe('invalidFields', () => {
	it('names each set built-in field its reader rejects, and nothing else', () => {
		expect(invalidFields({ title: 'T', order: 'x', draft: 'anything', section: [3] })).toEqual([
			{ key: 'order', expected: 'a number' },
			{ key: 'section', expected: 'a string or a list of strings' }
		]);
	});
});

describe('customFields', () => {
	it('keeps every key that is not built in, as written', () => {
		expect(customFields({ title: 'T', order: 1, draft: true, tags: ['a'] })).toEqual({
			draft: true,
			tags: ['a']
		});
	});

	it('does not mistake an inherited object key for a built-in field', () => {
		expect(customFields({ constructor: 'x', toString: 'y' })).toEqual({
			constructor: 'x',
			toString: 'y'
		});
	});
});

describe('likelyTypoOf', () => {
	it.each([
		['ordr', 'order'],
		['oder', 'order'],
		['orders', 'order'],
		['tilte', 'title'],
		['titel', 'title'],
		['Title', 'title'],
		['sectoin', 'section'],
		['lastupdated', 'lastUpdated'],
		['descripton', 'description'],
		['itle', 'title'],
		['rder', 'order'],
		['roder', 'order']
	])('reads %s as %s', (key, builtin) => {
		expect(likelyTypoOf(key)).toBe(builtin);
	});

	it.each(['draft', 'badge', 'tags', 'sidebar', 'layout', 'border'])('leaves %s alone', (key) => {
		expect(likelyTypoOf(key)).toBeUndefined();
	});
});
