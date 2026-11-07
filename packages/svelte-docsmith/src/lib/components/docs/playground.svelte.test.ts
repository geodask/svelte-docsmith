import { describe, expect, it } from 'vitest';
import type { ExtractedProps } from '../../core/extracted-props.js';
import { Playground, type PlaygroundValues } from './playground.svelte.js';

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
			literalDefault: 'default',
			description: 'The <code>look</code>.'
		},
		{
			name: 'tone',
			type: "'a' | 'b'",
			required: false,
			bindable: false,
			control: { kind: 'options', options: ['a', 'b'] }
		},
		{
			name: 'href',
			type: 'string',
			required: false,
			bindable: false,
			control: { kind: 'text' }
		},
		{
			name: 'label',
			type: 'string',
			required: true,
			bindable: false,
			control: { kind: 'text' }
		},
		{
			name: 'count',
			type: 'number',
			required: false,
			bindable: false,
			control: { kind: 'number' }
		},
		{
			name: 'external',
			type: 'boolean',
			default: 'false',
			required: false,
			bindable: false,
			control: { kind: 'boolean' },
			literalDefault: false
		},
		{ name: 'onclick', type: '() => void', required: false, bindable: false },
		{ name: 'children', type: 'Snippet', required: true, bindable: false }
	]
};

const playground = (args?: PlaygroundValues) => new Playground(badge, () => args);

describe('controls', () => {
	it('has one per prop whose type allows one, in declaration order', () => {
		expect(playground().controls.map((c) => c.name)).toEqual([
			'variant',
			'tone',
			'href',
			'label',
			'count',
			'external'
		]);
	});

	it('offers "unset" as a choice only for a prop without a literal default', () => {
		const [variant, tone] = playground().controls;
		expect(variant).toMatchObject({ kind: 'options', choices: ['default', 'success'] });
		expect(tone).toMatchObject({ kind: 'options', choices: [undefined, 'a', 'b'] });
	});

	it('marks text and number fields optional unless the prop is required', () => {
		const byName = Object.fromEntries(playground().controls.map((c) => [c.name, c]));
		expect(byName.href).toMatchObject({ kind: 'text', optional: true });
		expect(byName.label).toMatchObject({ kind: 'text', optional: false });
		expect(byName.count).toMatchObject({ kind: 'number', optional: true });
	});

	it('carries the description for the tooltip', () => {
		expect(playground().controls[0].description).toBe('The <code>look</code>.');
	});
});

describe('starting values', () => {
	it('start from literal defaults and leave the rest unset', () => {
		expect(playground().values).toEqual({ variant: 'default', external: false });
	});

	it('let args win, including values for props without a control', () => {
		const onclick = () => {};
		expect(playground({ variant: 'success', onclick, href: undefined }).values).toEqual({
			variant: 'success',
			external: false,
			onclick
		});
	});
});

describe('setting values', () => {
	it('sets a choice, and "unset" leaves the prop to the component', () => {
		const p = playground();
		p.set('tone', 'b');
		expect(p.values).toMatchObject({ tone: 'b' });
		p.set('tone', undefined);
		expect(p.values).not.toHaveProperty('tone');
	});

	it('flips a switch, turning an unset boolean on first', () => {
		const p = playground();
		p.toggle('external');
		expect(p.values.external).toBe(true);
		p.toggle('external');
		expect(p.values.external).toBe(false);
		p.toggle('flag');
		expect(p.values.flag).toBe(true);
	});

	it('clears an optional text prop to unset but keeps a required one as an empty string', () => {
		const p = playground({ href: '/x', label: 'Hi' });
		p.enter('href', '');
		p.enter('label', '');
		expect(p.values).not.toHaveProperty('href');
		expect(p.values.label).toBe('');
		p.enter('href', '/docs');
		expect(p.values.href).toBe('/docs');
	});

	it('parses a number field, leaving it unset when empty or not a number', () => {
		const p = playground();
		p.enter('count', '3');
		expect(p.values.count).toBe(3);
		p.enter('count', '-2.5');
		expect(p.values.count).toBe(-2.5);
		p.enter('count', '');
		expect(p.values).not.toHaveProperty('count');
		p.enter('count', '1e999');
		expect(p.values).not.toHaveProperty('count');
	});

	it('ignores typed input for a prop without a text or number control', () => {
		const p = playground();
		p.enter('external', 'yes');
		p.enter('missing', 'x');
		expect(p.values).toEqual({ variant: 'default', external: false });
	});

	it('resets to the starting values, reading args again', () => {
		let args: PlaygroundValues = { href: '/x' };
		const p = new Playground(badge, () => args);
		p.set('variant', 'success');
		p.toggle('external');
		args = { href: '/y' };
		p.reset();
		expect(p.values).toEqual({ variant: 'default', external: false, href: '/y' });
	});

	it('works with no args getter', () => {
		expect(new Playground(badge).values).toEqual({ variant: 'default', external: false });
	});
});

describe('usage line', () => {
	it("shows only what differs from the component's defaults", () => {
		const p = playground();
		expect(p.usage).toBe('<Badge>…</Badge>');
		p.set('variant', 'success');
		p.toggle('external');
		expect(p.usage).toBe('<Badge variant="success" external>…</Badge>');
	});

	it('writes args that differ from the defaults too, since they are part of the usage', () => {
		expect(playground({ variant: 'success' }).usage).toBe('<Badge variant="success">…</Badge>');
	});

	it('lists props in declaration order, whatever order they were set in', () => {
		const p = playground({ count: 1, href: '/x' });
		p.toggle('external');
		p.set('variant', 'success');
		expect(p.usage).toBe('<Badge variant="success" href="/x" count={1} external>…</Badge>');
	});

	it('writes each kind of value as Svelte markup', () => {
		const p = new Playground({ ...badge, name: 'X', props: [] }, () => ({
			off: false,
			n: -2,
			quote: 'say "hi"',
			fn: () => {},
			unset: undefined
		}));
		expect(p.usage).toBe('<X off={false} n={-2} quote={"say \\"hi\\""} />');
	});

	it('breaks a long line into one prop per line', () => {
		const p = playground({
			variant: 'success',
			href: 'https://example.com/a/rather/long/path',
			external: true
		});
		expect(p.usage).toBe(
			'<Badge\n\tvariant="success"\n\thref="https://example.com/a/rather/long/path"\n\texternal\n>\n\t…\n</Badge>'
		);
	});
});
