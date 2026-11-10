import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Tooltip from './tooltip.svelte';

vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);

const words = createRawSnippet(() => ({ render: () => '<span>HMR</span>' }));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Tooltip', () => {
	it('marks the words as having a note, and keeps the note closed', () => {
		render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
		const trigger = screen.getByRole('button', { name: 'HMR' });
		expect(trigger).toHaveClass('docsmith-tooltip-trigger');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('Hot module replacement')).toBeNull();
	});

	it('opens on a click or tap, describes the words, and closes on Escape', async () => {
		render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
		const trigger = screen.getByRole('button', { name: 'HMR' });

		await fireEvent.pointerDown(trigger, { button: 0 });
		await fireEvent.click(trigger, { button: 0 });
		await settle();
		const note = screen.getByText('Hot module replacement');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(trigger.getAttribute('aria-describedby')).toBe(note.closest('[id]')!.id);

		await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
		await settle();
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	it('opens on keyboard focus and closes when focus leaves', async () => {
		render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
		const trigger = screen.getByRole('button', { name: 'HMR' });
		// jsdom has no focus-visible heuristics: say this focus came from a key.
		vi.spyOn(trigger, 'matches').mockImplementation((selector) => selector === ':focus-visible');

		await fireEvent.focus(trigger);
		await settle();
		expect(trigger).toHaveAttribute('aria-expanded', 'true');

		await fireEvent.blur(trigger);
		await settle();
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	it('takes a snippet as the note', async () => {
		const note = createRawSnippet(() => ({ render: () => '<span>Runs <code>vite</code></span>' }));
		render(Tooltip, { props: { note, children: words } });
		await fireEvent.click(screen.getByRole('button', { name: 'HMR' }), { button: 0 });
		await settle();
		expect(screen.getByText('vite').tagName).toBe('CODE');
	});
});
