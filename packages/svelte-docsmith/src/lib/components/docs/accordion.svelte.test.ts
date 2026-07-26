import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Fixture from './_fixtures/accordion-basic.svelte';

describe('Accordion', () => {
	it('starts collapsed and expands the item that is activated', async () => {
		render(Fixture);
		const first = screen.getByRole('button', { name: 'First' });
		expect(first).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(first);
		expect(first).toHaveAttribute('aria-expanded', 'true');
		expect(await screen.findByText('First body')).toBeVisible();
	});

	it('keeps a single panel open at a time by default', async () => {
		render(Fixture);
		const first = screen.getByRole('button', { name: 'First' });
		const second = screen.getByRole('button', { name: 'Second' });

		await fireEvent.click(first);
		expect(first).toHaveAttribute('aria-expanded', 'true');

		await fireEvent.click(second);
		await vi.waitFor(() => expect(second).toHaveAttribute('aria-expanded', 'true'));
		expect(first).toHaveAttribute('aria-expanded', 'false');
	});

	it('allows several panels open at once when multiple', async () => {
		render(Fixture, { props: { multiple: true } });
		const first = screen.getByRole('button', { name: 'First' });
		const second = screen.getByRole('button', { name: 'Second' });

		await fireEvent.click(first);
		await fireEvent.click(second);

		await vi.waitFor(() => expect(second).toHaveAttribute('aria-expanded', 'true'));
		expect(first).toHaveAttribute('aria-expanded', 'true');
	});
});
