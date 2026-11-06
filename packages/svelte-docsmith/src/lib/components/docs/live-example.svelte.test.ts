import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import LiveExample from './live-example.svelte';
import Fixture from './_fixtures/live-example-controls.svelte';
import type { ExtractedProps } from '../../core/extracted-props.js';

const props: ExtractedProps = {
	name: 'Badge',
	typeParameters: [],
	inherited: [],
	props: [
		{
			name: 'variant',
			required: false,
			bindable: false,
			control: { kind: 'options', options: ['default', 'success'] },
			initial: 'default'
		},
		{
			name: 'tone',
			required: false,
			bindable: false,
			control: { kind: 'options', options: ['a', 'b', 'c', 'd', 'e'] }
		},
		{ name: 'href', required: false, bindable: false, control: { kind: 'text' } },
		{ name: 'count', required: false, bindable: false, control: { kind: 'number' } },
		{
			name: 'external',
			required: false,
			bindable: false,
			control: { kind: 'boolean' },
			initial: false
		},
		{ name: 'children', required: true, bindable: false }
	]
};

const rendered = () => JSON.parse(screen.getByTestId('rendered').textContent!);
const usage = () => screen.getByText(/^<Badge/).textContent;

describe('LiveExample', () => {
	it('renders a plain example without controls', () => {
		const children = createRawSnippet(() => ({ render: () => '<span>plain</span>' }));
		render(LiveExample, { props: { children } });
		expect(screen.getByText('plain')).toBeInTheDocument();
		expect(screen.queryByText('Controls')).not.toBeInTheDocument();
	});

	it('passes starting values to the example, args first', () => {
		render(Fixture, { props: { controls: props, args: { href: '/x' } } });
		expect(rendered()).toEqual({ variant: 'default', external: false, href: '/x' });
		expect(usage()).toBe('<Badge href="/x">…</Badge>');
	});

	it('updates the example as each kind of control changes', async () => {
		render(Fixture, { props: { controls: props } });

		await fireEvent.click(screen.getByRole('button', { name: 'success' }));
		expect(screen.getByRole('button', { name: 'success' })).toHaveAttribute('aria-pressed', 'true');

		await fireEvent.click(screen.getByRole('switch', { name: 'external' }));
		expect(screen.getByRole('switch', { name: 'external' })).toHaveAttribute(
			'aria-checked',
			'true'
		);

		await fireEvent.input(screen.getByRole('textbox', { name: 'href' }), {
			target: { value: '/docs' }
		});
		await fireEvent.input(screen.getByRole('spinbutton', { name: 'count' }), {
			target: { value: '3' }
		});
		// More than four choices (plus "unset") become a select.
		await fireEvent.change(screen.getByRole('combobox', { name: 'tone' }), {
			target: { value: '2' }
		});

		expect(rendered()).toEqual({
			variant: 'success',
			external: true,
			href: '/docs',
			count: 3,
			tone: 'b'
		});
		expect(usage()).toContain('variant="success"');
		expect(usage()).toContain('count={3}');
	});

	it('clears an optional text prop back to unset', async () => {
		render(Fixture, { props: { controls: props, args: { href: '/x' } } });
		await fireEvent.input(screen.getByRole('textbox', { name: 'href' }), {
			target: { value: '' }
		});
		expect(rendered()).not.toHaveProperty('href');
	});

	it('resets every control to its starting value', async () => {
		render(Fixture, { props: { controls: props } });
		await fireEvent.click(screen.getByRole('switch', { name: 'external' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		expect(rendered()).toEqual({ variant: 'default', external: false });
	});
});
