import type { TocItem } from './types.js';

/**
 * Scan a rendered content element for `h2`/`h3` headings and return a flat
 * {@link TocItem} list (with a `depth` so the renderer can indent `h3`s). Only
 * headings with an `id` are included, since ids (from rehype-slug) are what the
 * in-page links point at.
 *
 * Pure and DOM-only, so it is trivially testable and safe to re-run after every
 * navigation.
 */
export function tocFromContent(container: HTMLElement, selector = 'h2, h3'): TocItem[] {
	return Array.from(container.querySelectorAll<HTMLElement>(selector))
		.filter((h) => h.id)
		.map((h) => ({
			id: h.id,
			title: h.textContent?.trim() ?? '',
			depth: h.tagName === 'H3' ? 3 : 2
		}));
}
