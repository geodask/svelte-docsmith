import type { DocsContentItem } from './content.js';

/** A single sidebar link (a leaf). */
export type NavItem = { title: string; url: string };

/** A titled group of sidebar entries, which may themselves be nested groups. */
export type NavGroup = { title: string; items: NavNode[] };

/** A sidebar entry: either a link or a nested group. */
export type NavNode = NavItem | NavGroup;

/** Narrow a {@link NavNode} to a {@link NavGroup} (an entry with children). */
export function isNavGroup(node: NavNode): node is NavGroup {
	return 'items' in node;
}

/**
 * Normalize a page's `section` to a group path. A string is a single level; an
 * array is a nested path; blank or missing sections fall under "Docs". Empty
 * strings inside an array are dropped so a stray `['Guides', '']` stays sane.
 */
function sectionPath(section: string | string[] | undefined): string[] {
	const segs = Array.isArray(section) ? section : section ? [section] : [];
	const clean = segs.filter((s) => typeof s === 'string' && s.trim() !== '');
	return clean.length ? clean : ['Docs'];
}

// A mutable tree node used while building the nav; `order` tracks the smallest
// order seen in the subtree so groups sort by their earliest child.
type Builder = {
	title: string;
	order: number;
	groups: Map<string, Builder>;
	leaves: Array<{ title: string; url: string; order: number }>;
};

function makeBuilder(title: string): Builder {
	return { title, order: Infinity, groups: new Map(), leaves: [] };
}

/**
 * Emit a group's children (nested groups and leaf links) as one list, sorted by
 * `order` and then title. The title tiebreak keeps the output deterministic when
 * pages share an order (e.g. all default to 0), instead of depending on the
 * filesystem scan order.
 */
function emitItems(node: Builder): NavNode[] {
	const entries: Array<{ order: number; title: string; node: NavNode }> = [];

	for (const leaf of node.leaves) {
		entries.push({
			order: leaf.order,
			title: leaf.title,
			node: { title: leaf.title, url: leaf.url }
		});
	}
	for (const group of node.groups.values()) {
		entries.push({
			order: group.order,
			title: group.title,
			node: { title: group.title, items: emitItems(group) }
		});
	}

	entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
	return entries.map((e) => e.node);
}

/**
 * Derive sidebar nav from a content collection. Each page's `section` (a string
 * or a nested path) places it in the tree; within every level, entries order by
 * `order` (then title), and a group inherits the smallest `order` of its
 * descendants so groups sort by their earliest child. Top-level entries are
 * always groups; pages without a section fall under "Docs".
 */
export function navFromContent(content: DocsContentItem[]): NavGroup[] {
	const root = makeBuilder('');

	for (const item of content) {
		const order = item.order ?? 0;
		let node = root;
		for (const seg of sectionPath(item.section)) {
			let child = node.groups.get(seg);
			if (!child) {
				child = makeBuilder(seg);
				node.groups.set(seg, child);
			}
			child.order = Math.min(child.order, order);
			node = child;
		}
		node.leaves.push({ title: item.title, url: item.path, order });
	}

	// The root only ever holds groups (every page has at least one path segment),
	// so its emitted items are all NavGroups.
	return emitItems(root) as NavGroup[];
}

/**
 * Flatten the nav tree to its leaf links in sidebar reading order (depth-first),
 * for the prev/next pager.
 */
export function flattenNav(nodes: NavNode[]): NavItem[] {
	const out: NavItem[] = [];
	for (const node of nodes) {
		if (isNavGroup(node)) out.push(...flattenNav(node.items));
		else out.push(node);
	}
	return out;
}

/**
 * The trail of group titles leading to the page at `url` (top group first,
 * excluding the page itself), or `undefined` if the page is not in the tree.
 * Drives the breadcrumb trail.
 */
export function navTrail(nodes: NavNode[], url: string): string[] | undefined {
	for (const node of nodes) {
		if (isNavGroup(node)) {
			const inner = navTrail(node.items, url);
			if (inner) return [node.title, ...inner];
		} else if (node.url === url) {
			return [];
		}
	}
	return undefined;
}
