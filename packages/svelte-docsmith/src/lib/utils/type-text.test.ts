import { describe, expect, it } from 'vitest';
import { splitTopLevel, unionMembers } from './type-text.js';

describe('unionMembers', () => {
	it('splits a top-level union', () => {
		expect(unionMembers("'a' | 'b' | 'c'")).toEqual(["'a'", "'b'", "'c'"]);
	});

	it('keeps nested unions together', () => {
		expect(unionMembers('Array<A | B> | { x: 1 | 2 } | [C | D] | string')).toEqual([
			'Array<A | B>',
			'{ x: 1 | 2 }',
			'[C | D]',
			'string'
		]);
	});

	it('keeps a signature whole', () => {
		expect(unionMembers('(a: string) => A | B')).toEqual(['(a: string) => A | B']);
		expect(unionMembers('(() => void) | string')).toEqual(['(() => void)', 'string']);
	});

	it('ignores pipes inside string literals', () => {
		expect(unionMembers('\'a|b\' | "c|d"')).toEqual(["'a|b'", '"c|d"']);
	});

	it('returns a lone type as is', () => {
		expect(unionMembers(' string ')).toEqual(['string']);
	});
});

describe('splitTopLevel', () => {
	it('splits on a separator outside brackets', () => {
		expect(splitTopLevel('T extends Record<string, number>, U', ',')).toEqual([
			'T extends Record<string, number>',
			' U'
		]);
	});
});
