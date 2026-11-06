/**
 * Reading order: where a page sits and what comes before it. The sidebar, the
 * prev/next pager, `llms.txt`, `llms-full.txt` and the MCP server's
 * `list_pages` all show pages in this order, so it is decided here once rather
 * than restated by each of them.
 *
 * The rule: a page's `section` names its group path (a string is one level, an
 * array is nested, blank segments are dropped, none means "Docs"). Within a
 * group, pages and subgroups sort by `order` and then by title, and a group
 * takes the smallest `order` found anywhere below it.
 */

/** Anything that can be put in reading order. */
export type Placed = { title: string; section?: string | string[]; order?: number };

/** A group in the reading tree: its own title, its full path, and its entries in order. */
export type ReadingGroup<T> = { title: string; path: string[]; entries: ReadingEntry<T>[] };

/** One entry in a group: a page, or a nested group. */
export type ReadingEntry<T> = { page: T } | { group: ReadingGroup<T> };

/**
 * Normalize a page's `section` to its group path. A string is a single level;
 * an array is a nested path; blank or missing sections fall under "Docs".
 * Blank strings inside an array are dropped so a stray `['Guides', '']` stays
 * sane.
 */
export function sectionPath(section: string | string[] | undefined): string[] {
	const segs = Array.isArray(section) ? section : section ? [section] : [];
	const clean = segs.filter((s) => typeof s === 'string' && s.trim() !== '');
	return clean.length ? clean : ['Docs'];
}

type Builder<T> = {
	title: string;
	path: string[];
	order: number;
	groups: Map<string, Builder<T>>;
	pages: Array<{ order: number; page: T }>;
};

function makeBuilder<T>(title: string, path: string[]): Builder<T> {
	return { title, path, order: Infinity, groups: new Map(), pages: [] };
}

function emit<T extends Placed>(node: Builder<T>): ReadingEntry<T>[] {
	const entries: Array<{ order: number; title: string; entry: ReadingEntry<T> }> = [];
	for (const { order, page } of node.pages) {
		entries.push({ order, title: page.title, entry: { page } });
	}
	for (const group of node.groups.values()) {
		entries.push({
			order: group.order,
			title: group.title,
			entry: { group: { title: group.title, path: group.path, entries: emit(group) } }
		});
	}
	// The title tiebreak keeps the result deterministic when pages share an
	// order (e.g. all default to 0), instead of depending on input order.
	entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
	return entries.map((e) => e.entry);
}

/**
 * Pages as the sidebar shows them: top-level groups, each holding its pages and
 * subgroups in reading order. Every page sits in at least one group.
 */
export function readingTree<T extends Placed>(items: T[]): ReadingGroup<T>[] {
	const root = makeBuilder<T>('', []);
	for (const item of items) {
		const order = item.order ?? 0;
		let node = root;
		for (const seg of sectionPath(item.section)) {
			let child = node.groups.get(seg);
			if (!child) {
				child = makeBuilder(seg, [...node.path, seg]);
				node.groups.set(seg, child);
			}
			child.order = Math.min(child.order, order);
			node = child;
		}
		node.pages.push({ order, page: item });
	}
	// Every page has at least one path segment, so the root holds only groups.
	return emit(root).flatMap((entry) => ('group' in entry ? [entry.group] : []));
}

function* walk<T>(entries: ReadingEntry<T>[]): Generator<ReadingEntry<T>> {
	for (const entry of entries) {
		yield entry;
		if ('group' in entry) yield* walk(entry.group.entries);
	}
}

/** Every page, one after another, in the order a reader paging through the sidebar meets them. */
export function readingSequence<T extends Placed>(items: T[]): T[] {
	const out: T[] = [];
	for (const entry of walk(readingTree(items).map((group) => ({ group })))) {
		if ('page' in entry) out.push(entry.page);
	}
	return out;
}

/**
 * Pages under flat section headings, for text output that can't nest: each
 * group with pages of its own becomes one section, headed by its path joined
 * with ` / `, in the order the sidebar reaches the group. A nested section
 * follows its parent's section, never before it.
 */
export function readingSections<T extends Placed>(items: T[]): Array<[string, T[]]> {
	const out: Array<[string, T[]]> = [];
	for (const entry of walk(readingTree(items).map((group) => ({ group })))) {
		if (!('group' in entry)) continue;
		const pages = entry.group.entries.flatMap((e) => ('page' in e ? [e.page] : []));
		if (pages.length) out.push([entry.group.path.join(' / '), pages]);
	}
	return out;
}
