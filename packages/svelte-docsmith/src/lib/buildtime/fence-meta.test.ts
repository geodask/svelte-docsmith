import { describe, expect, it } from 'vitest';
import { parseFenceMeta, hasTwoslash } from './fence-meta.js';

describe('parseFenceMeta', () => {
	it('reads a double-quoted title', () => {
		expect(parseFenceMeta('title="vite.config.ts"').title).toBe('vite.config.ts');
	});

	it('reads a single-quoted title and keeps its spaces', () => {
		expect(parseFenceMeta("title='src/lib/my file.ts'").title).toBe('src/lib/my file.ts');
	});

	it('reads an unquoted title up to the next space', () => {
		expect(parseFenceMeta('title=app.css showLineNumbers').title).toBe('app.css');
	});

	it('treats showLineNumbers as a bare flag', () => {
		expect(parseFenceMeta('showLineNumbers').lineNumbers).toBe(true);
		expect(parseFenceMeta('lineNumbers').lineNumbers).toBe(true);
	});

	it('lets an explicit false turn numbering off', () => {
		expect(parseFenceMeta('showLineNumbers=false').lineNumbers).toBe(false);
		expect(parseFenceMeta('noLineNumbers').lineNumbers).toBe(false);
	});

	it('leaves lineNumbers undefined when unmentioned, so the global default wins', () => {
		expect(parseFenceMeta('title="a.ts"').lineNumbers).toBeUndefined();
		expect(parseFenceMeta(undefined).lineNumbers).toBeUndefined();
	});

	it('reads startLine and implies numbering', () => {
		const meta = parseFenceMeta('startLine=12');
		expect(meta.startLine).toBe(12);
		expect(meta.lineNumbers).toBe(true);
	});

	it('ignores a startLine that is not a usable number', () => {
		expect(parseFenceMeta('startLine=abc').startLine).toBeUndefined();
		expect(parseFenceMeta('startLine=0').startLine).toBeUndefined();
		expect(parseFenceMeta('startLine=-3').startLine).toBeUndefined();
	});

	it('combines several entries', () => {
		expect(parseFenceMeta('title="vite.config.ts" showLineNumbers startLine=5')).toEqual({
			title: 'vite.config.ts',
			lineNumbers: true,
			startLine: 5
		});
	});

	it('ignores unknown entries rather than failing the fence', () => {
		expect(parseFenceMeta('someFutureFlag=1 title="a.ts" {1,3}')).toEqual({ title: 'a.ts' });
	});

	it('returns nothing for empty or absent meta', () => {
		expect(parseFenceMeta('')).toEqual({});
		expect(parseFenceMeta(undefined)).toEqual({});
	});
});

describe('hasTwoslash', () => {
	it('detects the bare twoslash flag', () => {
		expect(hasTwoslash('twoslash')).toBe(true);
		expect(hasTwoslash('title="a.ts" twoslash')).toBe(true);
	});

	it('is false when absent, and is not fooled by a title containing the word', () => {
		expect(hasTwoslash(undefined)).toBe(false);
		expect(hasTwoslash('title="twoslash"')).toBe(false);
	});
});
