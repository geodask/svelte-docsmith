/**
 * Section cards: one level of a section, as links. `<SectionCards />` renders
 * them as cards and agent markdown writes them out as a list, so both read the
 * same pages in the same order from here.
 */
import {
	readingTree,
	sectionPath,
	type Placed,
	type ReadingEntry,
	type ReadingGroup
} from './reading-order.js';

/** A page as section cards read it: placed in reading order, with a path. */
export type SectionPage = Placed & { path: string; description?: string };

/** One card: a page, or a subsection linking to its first page. */
export type SectionCard = { title: string; href: string; description?: string };

/**
 * The cards for a section: its pages and subsections in reading order, one
 * level deep. A subsection is one card, titled with its name and linking to its
 * first page. `exclude` (the current page's path) is left out, and so is a
 * subsection with no page left in it. An unknown section has no cards.
 *
 * `pages` should be one version's pages, so the cards never cross versions.
 */
export function sectionCards(
	pages: SectionPage[],
	section: string | string[] | undefined,
	exclude?: string
): SectionCard[] {
	const shown = exclude === undefined ? pages : pages.filter((page) => page.path !== exclude);
	const path = sectionPath(section);
	let entries: ReadingEntry<SectionPage>[] = readingTree(shown).map((group) => ({ group }));
	for (const segment of path) {
		const group = entries.find(
			(entry): entry is { group: ReadingGroup<SectionPage> } =>
				'group' in entry && entry.group.title === segment
		);
		if (!group) return [];
		entries = group.group.entries;
	}
	return entries.flatMap((entry): SectionCard[] => {
		if ('page' in entry) {
			const { title, path: href, description } = entry.page;
			return [description ? { title, href, description } : { title, href }];
		}
		const first = firstPage(entry.group.entries);
		return first ? [{ title: entry.group.title, href: first.path }] : [];
	});
}

/** The first page under a group, depth-first. */
function firstPage(entries: ReadingEntry<SectionPage>[]): SectionPage | undefined {
	for (const entry of entries) {
		if ('page' in entry) return entry.page;
		const nested = firstPage(entry.group.entries);
		if (nested) return nested;
	}
	return undefined;
}
