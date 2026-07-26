import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Card from './card.svelte';

const body = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Card', () => {
	it('renders a titled, non-interactive card by default', () => {
		const { container } = render(Card, {
			props: { title: 'Guides', children: body('Learn the basics') }
		});
		expect(screen.getByRole('heading', { name: 'Guides' })).toBeInTheDocument();
		expect(screen.getByText('Learn the basics')).toBeInTheDocument();
		expect(container.querySelector('a')).toBeNull();
	});

	it('becomes a same-tab link card when given an href', () => {
		render(Card, { props: { title: 'Install', href: '/docs/install', children: body('x') } });
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/docs/install');
		expect(link).not.toHaveAttribute('target');
	});

	it('opens an external link card in a new tab with a safe rel', () => {
		render(Card, {
			props: { title: 'Source', href: 'https://example.com', external: true, children: body('x') }
		});
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});
});
