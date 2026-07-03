/**
 * Static site configuration passed to `DocsShell`. Content-derived data (the
 * sidebar nav) is NOT here — it comes from your content collection at runtime.
 */
export type DocsmithConfig = {
	/** Site title, shown in the sidebar header. */
	title: string;
	/** Optional GitHub URL; renders a link in the header when set. */
	github?: string;
	/** Optional version string, shown in the header (e.g. your library version). */
	version?: string;
};

/**
 * The minimal shape `DocsShell` needs from each content entry to build the
 * sidebar. A velite `docs` collection with title/section/order/path frontmatter
 * satisfies this structurally.
 */
export type DocsContentItem = {
	title: string;
	path: string;
	section?: string;
	order?: number;
	description?: string;
};

/** A single sidebar link. */
export type NavItem = { title: string; url: string };

/** A titled group of sidebar links. */
export type NavGroup = { title: string; items: NavItem[] };

/**
 * Derive sidebar nav from a content collection (PLAN.md §2.6): group by
 * `section`, order by `order` within a group, and order groups by the smallest
 * `order` they contain. Entries without a `section` fall under "Docs".
 */
export function navFromContent(content: DocsContentItem[]): NavGroup[] {
	const groups = new Map<string, { minOrder: number; items: Array<NavItem & { order: number }> }>();

	for (const item of content) {
		const section = item.section ?? 'Docs';
		const order = item.order ?? 0;
		const group = groups.get(section) ?? { minOrder: Infinity, items: [] };
		group.items.push({ title: item.title, url: item.path, order });
		group.minOrder = Math.min(group.minOrder, order);
		groups.set(section, group);
	}

	return [...groups.entries()]
		.sort((a, b) => a[1].minOrder - b[1].minOrder)
		.map(([title, group]) => ({
			title,
			items: group.items.sort((a, b) => a.order - b.order).map(({ title, url }) => ({ title, url }))
		}));
}
