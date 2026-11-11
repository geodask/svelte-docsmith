import type { DocsContentItem } from './content.js';
import { readingTree, type ReadingEntry } from './reading-order.js';

/**
 * A single sidebar link (a leaf). `isNew` marks a page new in the latest
 * release (see `DocsContentItem.isNew`).
 */
export type NavItem = { title: string; url: string; isNew?: boolean };

/** A titled group of sidebar entries, which may themselves be nested groups. */
export type NavGroup = { title: string; items: NavNode[] };

/** A sidebar entry: either a link or a nested group. */
export type NavNode = NavItem | NavGroup;

/** Narrow a {@link NavNode} to a {@link NavGroup} (an entry with children). */
export function isNavGroup(node: NavNode): node is NavGroup {
	return 'items' in node;
}

function toNavNodes(entries: ReadingEntry<DocsContentItem>[]): NavNode[] {
	return entries.map((entry) =>
		'page' in entry
			? entry.page.isNew
				? { title: entry.page.title, url: entry.page.path, isNew: true }
				: { title: entry.page.title, url: entry.page.path }
			: { title: entry.group.title, items: toNavNodes(entry.group.entries) }
	);
}

/**
 * Derive sidebar nav from a content collection, in reading order (see
 * `./reading-order.js`): each page's `section` places it in the tree, and
 * pages without one fall under "Docs". Top-level entries are always groups.
 */
export function navFromContent(content: DocsContentItem[]): NavGroup[] {
	return readingTree(content).map((group) => ({
		title: group.title,
		items: toNavNodes(group.entries)
	}));
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

/** One step in a breadcrumb trail: a label, and an optional jump target. */
export type Breadcrumb = { title: string; url?: string };

/**
 * First leaf URL under a group, depth-first. Groups have no page of their own,
 * so breadcrumbs that name a group link to its earliest page (the place a
 * reader lands if they "go up" into that section).
 */
function firstLeafUrl(group: NavGroup): string | undefined {
	for (const child of group.items) {
		if (isNavGroup(child)) {
			const url = firstLeafUrl(child);
			if (url) return url;
		} else {
			return child.url;
		}
	}
	return undefined;
}

/**
 * The trail of groups leading to the page at `url` (top group first, excluding
 * the page itself), or `undefined` if the page is not in the tree. Each group
 * step carries a `url` to its first leaf so breadcrumbs are navigable.
 */
export function navTrail(nodes: NavNode[], url: string): Breadcrumb[] | undefined {
	for (const node of nodes) {
		if (isNavGroup(node)) {
			const inner = navTrail(node.items, url);
			if (inner) {
				return [{ title: node.title, url: firstLeafUrl(node) }, ...inner];
			}
		} else if (node.url === url) {
			return [];
		}
	}
	return undefined;
}
