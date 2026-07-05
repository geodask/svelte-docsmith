import { BROWSER } from 'esm-env';
import { tick } from 'svelte';
import { tocFromContent } from './from-content.js';
import type { TocItem } from './types.js';

/**
 * A live table of contents: the headings scanned from the current page, plus
 * the id of the section currently in view.
 */
export type Toc = {
	/** Headings of the current page, in document order. */
	readonly items: TocItem[];
	/** Id of the heading whose section is currently in view, or `null`. */
	readonly activeId: string | null;
	/** Re-scan the content element. Call after each navigation. */
	refresh: () => Promise<void>;
};

/**
 * Create a table of contents bound to a content element.
 *
 * Two jobs, both re-run whenever the page changes:
 * - `refresh()` re-scans the rendered headings (call it from `afterNavigate` so
 *   client-side navigation updates the list, not just a full reload).
 * - a single `IntersectionObserver` tracks which heading is in view for
 *   scroll-spy highlighting, re-observing the new headings after each refresh.
 *
 * Deliberately small: no section wrappers, no multi-threshold ratio math, no
 * parent-highlight bookkeeping. One observer, one active id.
 */
export function createToc(contentFn: () => HTMLElement | null): Toc {
	let items = $state<TocItem[]>([]);
	let activeId = $state<string | null>(null);

	async function refresh() {
		// Wait for the navigated-to content to be in the DOM before scanning.
		await tick();
		const el = contentFn();
		items = el ? tocFromContent(el) : [];
	}

	$effect(() => {
		if (!BROWSER) return;
		const el = contentFn();
		const headingItems = items; // re-run this effect when the heading set changes
		if (!el || headingItems.length === 0) {
			activeId = null;
			return;
		}

		const headings = headingItems
			.map((item) => el.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`))
			.filter((node): node is HTMLElement => node !== null);

		const visible = new Set<string>();

		function recompute() {
			// The first heading (in document order) inside the active band wins.
			const firstVisible = headingItems.find((item) => visible.has(item.id));
			if (firstVisible) {
				activeId = firstVisible.id;
			} else if (activeId === null) {
				// Nothing in the band yet (top of page): default to the first heading.
				activeId = headingItems[0].id;
			}
			// Else keep the last active id — we're mid-section, between bands.
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				recompute();
			},
			// Active band: just below the sticky header down to ~a third of the
			// viewport, so the highlighted entry matches what you're reading.
			{ rootMargin: '-72px 0px -66% 0px', threshold: 0 }
		);

		headings.forEach((heading) => observer.observe(heading));
		return () => observer.disconnect();
	});

	return {
		get items() {
			return items;
		},
		get activeId() {
			return activeId;
		},
		refresh
	};
}
