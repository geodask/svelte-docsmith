import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Callout from './callout.svelte';

// A snippet standing in for the markdown body a real <Callout> wraps.
const body = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Callout', () => {
	it('renders as a note landmark with its body content', () => {
		render(Callout, { props: { children: body('Heads up, reader.') } });

		expect(screen.getByRole('note')).toBeInTheDocument();
		expect(screen.getByText('Heads up, reader.')).toBeInTheDocument();
	});

	it('defaults the heading to the capitalized variant label', async () => {
		const { rerender } = render(Callout, { props: { children: body('x') } });
		expect(screen.getByText('Note')).toBeInTheDocument(); // default variant

		await rerender({ variant: 'warning', children: body('x') });
		expect(screen.getByText('Warning')).toBeInTheDocument();
	});

	it('prefers an explicit title over the variant label', () => {
		render(Callout, { props: { variant: 'danger', title: 'Do not do this', children: body('x') } });

		expect(screen.getByText('Do not do this')).toBeInTheDocument();
		expect(screen.queryByText('Danger')).not.toBeInTheDocument();
	});

	it('applies the variant class so the right tint is painted', () => {
		const { container } = render(Callout, { props: { variant: 'tip', children: body('x') } });
		expect(container.querySelector('.callout')).toHaveClass('callout-tip');
	});
});
