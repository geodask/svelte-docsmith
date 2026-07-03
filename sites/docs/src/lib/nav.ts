import { docs } from '$content';

export type NavItem = { title: string; url: string };
export type NavGroup = { title: string; items: NavItem[] };

/**
 * Sidebar nav derived from velite content frontmatter (PLAN.md §2.6): nav is
 * generated from `section`/`order`/`title`, never hand-written. Pages are
 * grouped by `section`, ordered by `order` within a group; groups are ordered
 * by the smallest `order` they contain.
 */
function buildNav(): NavGroup[] {
	const groups = new Map<string, { minOrder: number; items: Array<NavItem & { order: number }> }>();

	for (const doc of docs) {
		const section = doc.section ?? 'Docs';
		const group = groups.get(section) ?? { minOrder: Infinity, items: [] };
		group.items.push({ title: doc.title, url: doc.path, order: doc.order });
		group.minOrder = Math.min(group.minOrder, doc.order);
		groups.set(section, group);
	}

	return [...groups.entries()]
		.sort((a, b) => a[1].minOrder - b[1].minOrder)
		.map(([title, group]) => ({
			title,
			items: group.items.sort((a, b) => a.order - b.order).map(({ title, url }) => ({ title, url }))
		}));
}

export const data = { navMain: buildNav() };
