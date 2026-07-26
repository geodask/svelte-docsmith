import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Badge from './badge.svelte';

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Badge', () => {
	it('renders inline as a span when it is not a link', () => {
		const { container } = render(Badge, { props: { children: label('Beta') } });
		expect(screen.getByText('Beta')).toBeInTheDocument();
		expect(container.querySelector('a')).toBeNull();
	});

	it('becomes a same-tab link when given an href', () => {
		render(Badge, { props: { href: '/changelog', children: label('v1.0') } });
		const link = screen.getByRole('link', { name: 'v1.0' });
		expect(link).toHaveAttribute('href', '/changelog');
		expect(link).not.toHaveAttribute('target');
	});

	it('opens an external link in a new tab with a safe rel', () => {
		render(Badge, {
			props: { href: 'https://example.com', external: true, children: label('Docs') }
		});
		const link = screen.getByRole('link', { name: 'Docs' });
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});
});
