import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/docs/install') } }));
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);
// The code block reads its text for the copy button; jsdom has no innerText.
Object.defineProperty(HTMLElement.prototype, 'innerText', {
	configurable: true,
	get(this: HTMLElement) {
		return this.textContent ?? '';
	}
});
const { default: Install } = await import('./install.svelte');

const tabs = ['pnpm', 'npm', 'yarn', 'bun'].map((manager) => ({
	manager,
	html: `<code><span class="line">${manager} add a</span></code>`
}));

describe('install block', () => {
	it('shows one tab per package manager, pnpm first', () => {
		render(Install, { props: { tabs, language: 'sh' } });
		expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
			'pnpm',
			'npm',
			'yarn',
			'bun'
		]);
		expect(screen.getByText('pnpm add a')).toBeVisible();
	});
});
