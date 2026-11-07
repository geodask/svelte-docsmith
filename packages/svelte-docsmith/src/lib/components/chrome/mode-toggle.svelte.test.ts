import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Drive the colour mode without a real DOM color scheme: a hoisted spy lets us assert
// the toggle delegates to mode-watcher rather than managing mode itself.
const { toggleMode } = vi.hoisted(() => ({ toggleMode: vi.fn() }));
vi.mock('mode-watcher', () => ({ mode: { current: 'light' }, toggleMode }));

import ModeToggle from './mode-toggle.svelte';
import * as api from '../../index.js';

describe('ModeToggle', () => {
	it('exposes a labelled button for assistive tech', () => {
		render(ModeToggle);
		// Mocked mode is light, so the control offers the dark destination.
		expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
	});

	it('delegates the switch to mode-watcher on click', async () => {
		render(ModeToggle);
		await fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
		expect(toggleMode).toHaveBeenCalledTimes(1);
	});

	it('is still exported under its old name until the next minor', () => {
		expect(api.ThemeToggle).toBe(api.ModeToggle);
		expect(api.ThemeProvider).toBe(api.ModeProvider);
		expect(api.ModeToggle).toBe(ModeToggle);
	});
});
