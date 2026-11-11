import { describe, expect, it } from 'vitest';
import { sectionCards, type SectionPage } from './section-cards.js';

const page = (
	path: string,
	title: string,
	section?: string | string[],
	order?: number,
	description?: string
): SectionPage => ({ path, title, section, order, description });

const pages = [
	page('/docs/components', 'Components', 'Components', 0),
	page('/docs/components/card', 'Card', 'Components', 2, 'A box that links somewhere.'),
	page('/docs/components/badge', 'Badge', 'Components', 1),
	page('/docs/components/forms/input', 'Input', ['Components', 'Forms'], 5),
	page('/docs/components/forms/select', 'Select', ['Components', 'Forms'], 4),
	page('/docs/components/forms/deep/x', 'Deep', ['Components', 'Forms', 'Deep'], 1),
	page('/docs/guides/start', 'Start', 'Guides', 0)
];

describe('sectionCards', () => {
	it('lists the section in reading order, without the excluded page', () => {
		expect(sectionCards(pages, 'Components', '/docs/components')).toEqual([
			{ title: 'Badge', href: '/docs/components/badge' },
			// A subsection is one card, placed by the smallest order below it and
			// linking to its first page in reading order.
			{ title: 'Forms', href: '/docs/components/forms/deep/x' },
			{
				title: 'Card',
				href: '/docs/components/card',
				description: 'A box that links somewhere.'
			}
		]);
	});

	it('reads a nested section path one level deep', () => {
		expect(sectionCards(pages, ['Components', 'Forms'])).toEqual([
			{ title: 'Deep', href: '/docs/components/forms/deep/x' },
			{ title: 'Select', href: '/docs/components/forms/select' },
			{ title: 'Input', href: '/docs/components/forms/input' }
		]);
	});

	it('drops a subsection whose only page is excluded', () => {
		expect(sectionCards(pages, ['Components', 'Forms'], '/docs/components/forms/deep/x')).toEqual([
			{ title: 'Select', href: '/docs/components/forms/select' },
			{ title: 'Input', href: '/docs/components/forms/input' }
		]);
	});

	it('has no cards for an unknown section', () => {
		expect(sectionCards(pages, 'Nope')).toEqual([]);
		expect(sectionCards(pages, ['Components', 'Nope'])).toEqual([]);
	});

	it('reads a page with no section as being in Docs', () => {
		expect(sectionCards([page('/docs', 'Intro')], undefined)).toEqual([
			{ title: 'Intro', href: '/docs' }
		]);
	});
});
