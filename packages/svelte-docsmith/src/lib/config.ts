/**
 * Static site configuration passed to `DocsShell`. Content-derived data (the
 * sidebar nav) is NOT here — it comes from your content collection at runtime.
 */
/** A link rendered in the header nav or footer. */
export type DocsmithLink = {
	label: string;
	href: string;
	/** Open in a new tab with `rel="noopener"`. */
	external?: boolean;
};

/** A titled column of links in the footer. */
export type DocsmithFooterColumn = {
	title: string;
	links: DocsmithLink[];
};

export type DocsmithConfig = {
	/** Site title, shown in the header/sidebar. */
	title: string;
	/** Optional GitHub URL; renders a link in the header when set. */
	github?: string;
	/** Optional version string, shown in the header (e.g. your library version). */
	version?: string;
	/** Optional logo image src; falls back to the built-in book mark. */
	logo?: string;
	/** Top-level header navigation links. */
	nav?: DocsmithLink[];
	/** Footer content, driven by data. */
	footer?: {
		/** Copyright / attribution line. */
		copyright?: string;
		/** Titled columns of links. */
		columns?: DocsmithFooterColumn[];
	};
};

/**
 * Validate a {@link DocsmithConfig} at build time. Purely a pass-through for
 * typed callers; the runtime checks catch untyped or dynamically-built configs
 * with a real error message instead of a blank header.
 */
export function defineConfig(config: DocsmithConfig): DocsmithConfig {
	if (typeof config !== 'object' || config === null) {
		throw new Error('[svelte-docsmith] defineConfig expects a config object.');
	}
	if (typeof config.title !== 'string' || config.title.trim() === '') {
		throw new Error(
			'[svelte-docsmith] config.title is required — the site title shown in the sidebar header.'
		);
	}
	for (const key of ['github', 'version', 'logo'] as const) {
		if (config[key] !== undefined && typeof config[key] !== 'string') {
			throw new Error(`[svelte-docsmith] config.${key} must be a string when set.`);
		}
	}
	if (config.nav !== undefined) {
		if (!Array.isArray(config.nav)) {
			throw new Error('[svelte-docsmith] config.nav must be an array of { label, href } links.');
		}
		for (const link of config.nav) {
			if (typeof link?.label !== 'string' || typeof link?.href !== 'string') {
				throw new Error(
					'[svelte-docsmith] each config.nav entry needs a string `label` and `href`.'
				);
			}
		}
	}
	if (
		config.footer !== undefined &&
		(typeof config.footer !== 'object' || config.footer === null)
	) {
		throw new Error(
			'[svelte-docsmith] config.footer must be an object ({ copyright?, columns? }).'
		);
	}
	return config;
}

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
