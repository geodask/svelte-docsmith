import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { DocsContentItem } from '#lib/core/index.js';
import SectionCardsShell from './_fixtures/section-cards-shell.svelte';
import SectionCards from './section-cards.svelte';

const item = (
	path: string,
	title: string,
	section: string | string[],
	order: number,
	description?: string
): DocsContentItem => ({ path, title, section, order, description });

const content = [
	item('/docs/components', 'Components', 'Components', 0),
	item('/docs/components/card', 'Card', 'Components', 2, 'A box that links somewhere.'),
	item('/docs/components/badge', 'Badge', 'Components', 1),
	item('/docs/components/forms/input', 'Input', ['Components', 'Forms'], 3),
	item('/docs/guides/start', 'Start', 'Guides', 0, 'Begin here.')
];
const on = (path: string) => ({
	scopedContent: content,
	entry: content.find((page) => page.path === path)
});

const cards = () =>
	screen
		.getAllByRole('link')
		.map((link) => [link.getAttribute('href'), link.textContent?.replace(/\s+/g, ' ').trim()]);

afterEach(() => vi.restoreAllMocks());

describe('SectionCards', () => {
	it("lists the page's own section in reading order, without the page", () => {
		render(SectionCardsShell, { props: { view: on('/docs/components') } });
		expect(cards()).toEqual([
			['/docs/components/badge', 'Badge'],
			['/docs/components/card', 'Card A box that links somewhere.'],
			['/docs/components/forms/input', 'Forms']
		]);
	});

	it('lists the section it names', () => {
		render(SectionCardsShell, { props: { view: on('/docs/components'), section: 'Guides' } });
		expect(cards()).toEqual([['/docs/guides/start', 'Start Begin here.']]);
	});

	it('renders nothing for an empty section', () => {
		const { container } = render(SectionCardsShell, {
			props: { view: on('/docs/components'), section: 'Nope' }
		});
		expect(container.querySelector('a')).toBeNull();
	});

	it('renders nothing outside DocsShell, and warns in dev', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(SectionCards);
		expect(container.querySelector('a')).toBeNull();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('only inside <DocsShell>'));
	});
});
