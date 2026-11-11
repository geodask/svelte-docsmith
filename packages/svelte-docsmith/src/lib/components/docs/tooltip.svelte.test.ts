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
const popover = () => document.querySelector('[data-slot="popover-content"]');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Tooltip', () => {
	it('marks the words as having a note, and keeps the note closed', () => {
		render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
		const trigger = screen.getByRole('button', { name: 'HMR' });
		expect(trigger).toHaveClass('docsmith-tooltip-trigger');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		// A screen reader hears the note as the words' description, open or not.
		const description = document.getElementById(trigger.getAttribute('aria-describedby')!);
		expect(description).toHaveTextContent('Hot module replacement');
		// Hidden, so it's never copied with the sentence; a description may be hidden.
		expect(description).toHaveAttribute('hidden');
		expect(popover()).toBeNull();
	});

	it('opens on hover and closes when the pointer leaves', async () => {
		vi.useFakeTimers();
		try {
			render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
			const trigger = screen.getByRole('button', { name: 'HMR' });

			await fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
			await fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
			await vi.advanceTimersByTimeAsync(300);
			expect(trigger).toHaveAttribute('aria-expanded', 'true');

			await fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
			await vi.advanceTimersByTimeAsync(600);
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		} finally {
			vi.useRealTimers();
		}
	});

	it('opens on a click or tap, describes the words, and closes on Escape', async () => {
		render(Tooltip, { props: { note: 'Hot module replacement', children: words } });
		const trigger = screen.getByRole('button', { name: 'HMR' });

		await fireEvent.pointerDown(trigger, { button: 0 });
		await fireEvent.click(trigger, { button: 0 });
		await settle();
		expect(popover()).toHaveTextContent('Hot module replacement');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');

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
		expect(popover()?.querySelector('code')).toHaveTextContent('vite');
	});
});
