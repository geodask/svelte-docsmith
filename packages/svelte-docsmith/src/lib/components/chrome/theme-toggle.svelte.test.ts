import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Drive the theme without a real DOM color scheme: a hoisted spy lets us assert
// the toggle delegates to mode-watcher rather than managing mode itself.
const { toggleMode } = vi.hoisted(() => ({ toggleMode: vi.fn() }));
vi.mock('mode-watcher', () => ({ mode: { current: 'light' }, toggleMode }));

import ThemeToggle from './theme-toggle.svelte';

describe('ThemeToggle', () => {
	it('exposes a labelled button for assistive tech', () => {
		render(ThemeToggle);
		// Mocked mode is light, so the control offers the dark destination.
		expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
	});

	it('delegates the switch to mode-watcher on click', async () => {
		render(ThemeToggle);
		await fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
		expect(toggleMode).toHaveBeenCalledTimes(1);
	});
});
