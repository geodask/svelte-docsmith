import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CopyButton from './copy-button.svelte';

describe('CopyButton', () => {
	it('keeps a stable "Copy" accessible name regardless of state', async () => {
		const { rerender } = render(CopyButton, { props: { copied: false, onclick: () => {} } });
		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

		// The name must not change to "Copied…" — that would make the control read as
		// a different button to assistive tech every time it's pressed.
		await rerender({ copied: true, onclick: () => {} });
		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
	});

	it('announces success through a polite live region only once copied', async () => {
		const { rerender, container } = render(CopyButton, {
			props: { copied: false, onclick: () => {} }
		});

		const live = container.querySelector('[aria-live="polite"]');
		expect(live).not.toBeNull();
		expect(live).toHaveTextContent(''); // silent until the copy lands

		await rerender({ copied: true, onclick: () => {} });
		expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
			'Copied to clipboard'
		);
	});

	it('invokes onclick when activated', async () => {
		const onclick = vi.fn();
		render(CopyButton, { props: { copied: false, onclick } });

		await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});
