import { describe, expect, it } from 'vitest';
import {
	ThemeLinkError,
	readThemeLinkJson,
	themeLinkPayload,
	writeThemeLinkJson
} from './theme-link.js';

const tokens = {
	light: { background: 'oklch(1 0 0)', primary: 'oklch(0.55 0.2 265)' },
	dark: { background: 'oklch(0.18 0 0)', primary: 'oklch(0.55 0.2 265)' }
};

const reason = (json: string) => {
	try {
		readThemeLinkJson(json);
	} catch (error) {
		return error instanceof ThemeLinkError ? error.reason : 'other';
	}
	return 'none';
};

describe('theme link JSON', () => {
	it('round-trips tokens and inputs', () => {
		const back = readThemeLinkJson(writeThemeLinkJson(tokens, { brand: '#d97a2b' }));
		expect(back).toEqual({ tokens, inputs: { brand: '#d97a2b' } });
	});

	it('reads a link without inputs', () => {
		expect(readThemeLinkJson(JSON.stringify({ v: 1, tokens }))).toEqual({
			tokens,
			inputs: undefined
		});
	});

	it('says why a link is unreadable', () => {
		expect(reason('not json')).toBe('damaged');
		expect(reason('null')).toBe('damaged');
		expect(reason(JSON.stringify({ v: 2, tokens }))).toBe('version');
		expect(reason(JSON.stringify({ v: 1, tokens: { light: {} } }))).toBe('no-tokens');
	});

	it('takes the payload from a whole link or a bare payload', () => {
		expect(themeLinkPayload('https://docsmith.geodask.com/themes#theme=abc-_ ')).toBe('abc-_');
		expect(themeLinkPayload(' abc ')).toBe('abc');
	});
});
