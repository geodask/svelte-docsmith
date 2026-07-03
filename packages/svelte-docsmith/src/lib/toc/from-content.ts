import type { TocItem } from './types.js';

/**
 * Build a nested {@link TocItem} tree by scanning a rendered content element for
 * headings. `h2` headings become top-level items; deeper headings nest under
 * the preceding `h2`. Each item's `url` is `#<heading id>` (ids come from
 * rehype-slug). Headings without an id are skipped.
 *
 * This is the runtime counterpart to velite's build-time nav (PLAN.md §2.6):
 * velite owns the sidebar, this owns the in-page table of contents.
 */
export function tocFromContent(container: HTMLElement, selector = 'h2, h3'): TocItem[] {
	const headings = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
		(h) => h.id
	);

	const root: TocItem[] = [];
	let current: TocItem | null = null;

	for (const heading of headings) {
		const item: TocItem = {
			title: heading.textContent?.trim() ?? '',
			url: `#${heading.id}`,
			items: []
		};

		if (heading.tagName === 'H2' || !current) {
			root.push(item);
			current = item;
		} else {
			current.items.push(item);
		}
	}

	return root;
}
