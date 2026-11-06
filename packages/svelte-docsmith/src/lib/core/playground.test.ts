import { describe, expect, it } from 'vitest';
import type { ExtractedProps } from './extracted-props.js';
import { controlledProps, definedValues, startingValues, usageLine } from './playground.js';

const badge: ExtractedProps = {
	name: 'Badge',
	typeParameters: [],
	inherited: [],
	props: [
		{
			name: 'variant',
			type: "'default' | 'success'",
			default: "'default'",
			required: false,
			bindable: false,
			control: { kind: 'options', options: ['default', 'success'] },
			initial: 'default'
		},
		{
			name: 'href',
			type: 'string',
			required: false,
			bindable: false,
			control: { kind: 'text' }
		},
		{
			name: 'external',
			type: 'boolean',
			default: 'false',
			required: false,
			bindable: false,
			control: { kind: 'boolean' },
			initial: false
		},
		{ name: 'children', type: 'Snippet', required: true, bindable: false }
	]
};

describe('controlledProps', () => {
	it('keeps the props that have a control, in order', () => {
		expect(controlledProps(badge).map((p) => p.name)).toEqual(['variant', 'href', 'external']);
	});
});

describe('startingValues', () => {
	it('starts from literal defaults and leaves the rest unset', () => {
		expect(startingValues(badge)).toEqual({ variant: 'default', external: false });
	});

	it('lets args win, including values for props without a control', () => {
		const onclick = () => {};
		expect(startingValues(badge, { variant: 'success', onclick, href: undefined })).toEqual({
			variant: 'success',
			external: false,
			onclick
		});
	});
});

describe('definedValues', () => {
	it('drops unset props', () => {
		expect(definedValues({ a: 1, b: undefined, c: false })).toEqual({ a: 1, c: false });
	});
});

describe('usageLine', () => {
	it('shows only what differs from the defaults', () => {
		expect(usageLine(badge, { variant: 'default', external: false })).toBe('<Badge>…</Badge>');
		expect(usageLine(badge, { variant: 'success', external: true })).toBe(
			'<Badge variant="success" external>…</Badge>'
		);
	});

	it('writes each kind of value as Svelte markup', () => {
		const line = usageLine(
			{ ...badge, name: 'X', props: [] },
			{
				off: false,
				n: -2,
				quote: 'say "hi"',
				fn: () => {},
				unset: undefined
			}
		);
		expect(line).toBe('<X off={false} n={-2} quote={"say \\"hi\\""} />');
	});

	it('breaks a long line into one prop per line', () => {
		const line = usageLine(badge, {
			variant: 'success',
			href: 'https://example.com/a/rather/long/path',
			external: true
		});
		expect(line).toBe(
			'<Badge\n\tvariant="success"\n\thref="https://example.com/a/rather/long/path"\n\texternal\n>\n\t…\n</Badge>'
		);
	});
});
