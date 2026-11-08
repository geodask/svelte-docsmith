import { describe, expect, it } from 'vitest';
import { formatStars } from './github-stars.js';

describe('formatStars', () => {
	it.each([
		[0, '0', '0'],
		[999, '999', '999'],
		[1234, '1.2k', '1,234'],
		[12_000, '12k', '12,000'],
		[1_250_000, '1.3m', '1,250,000']
	])('writes %d as %s, and %s in full', (stars, short, full) => {
		expect(formatStars(stars)).toEqual({ short, full });
	});
});
