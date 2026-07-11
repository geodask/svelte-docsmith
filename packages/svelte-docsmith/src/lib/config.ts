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
	/** Site title, shown in the header/sidebar and in the `<title>` suffix. */
	title: string;
	/**
	 * Default meta description, used for pages whose frontmatter has none (and
	 * as the site's social-share description).
	 */
	description?: string;
	/**
	 * Canonical site origin, e.g. `https://docs.example.com`. When set, DocsShell
	 * emits `<link rel="canonical">` and absolute Open Graph URLs.
	 */
	url?: string;
	/** Default social-share image (absolute URL, or a path resolved against `url`). */
	ogImage?: string;
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
		/**
		 * Show the "Powered by Svelte DocSmith" attribution in the footer.
		 * Defaults to `true`; set `false` to hide it.
		 */
		poweredBy?: boolean;
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
	for (const key of ['github', 'version', 'logo', 'description', 'url', 'ogImage'] as const) {
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
	if (config.footer !== undefined) {
		if (typeof config.footer !== 'object' || config.footer === null) {
			throw new Error(
				'[svelte-docsmith] config.footer must be an object ({ copyright?, columns?, poweredBy? }).'
			);
		}
		const { copyright, columns, poweredBy } = config.footer;
		if (copyright !== undefined && typeof copyright !== 'string') {
			throw new Error('[svelte-docsmith] config.footer.copyright must be a string when set.');
		}
		if (poweredBy !== undefined && typeof poweredBy !== 'boolean') {
			throw new Error('[svelte-docsmith] config.footer.poweredBy must be a boolean when set.');
		}
		if (columns !== undefined) {
			if (!Array.isArray(columns)) {
				throw new Error(
					'[svelte-docsmith] config.footer.columns must be an array of { title, links } columns.'
				);
			}
			for (const column of columns) {
				if (typeof column?.title !== 'string') {
					throw new Error(
						'[svelte-docsmith] each config.footer.columns entry needs a string `title`.'
					);
				}
				if (!Array.isArray(column.links)) {
					throw new Error(
						`[svelte-docsmith] config.footer column "${column.title}" needs a \`links\` array.`
					);
				}
				for (const link of column.links) {
					if (typeof link?.label !== 'string' || typeof link?.href !== 'string') {
						throw new Error(
							`[svelte-docsmith] each link in config.footer column "${column.title}" needs a string \`label\` and \`href\`.`
						);
					}
				}
			}
		}
	}
	return config;
}

/**
 * The minimal shape `DocsShell` needs from each content entry to build the
 * sidebar. The generated `svelte-docsmith/content` module produces these from
 * your pages' frontmatter; any source with matching title/path/section/order
 * fields satisfies it structurally.
 */
export type DocsContentItem = {
	title: string;
	path: string;
	section?: string;
	order?: number;
	description?: string;
	/**
	 * The page's `h2`/`h3` headings, extracted at build time by the `docsmith()`
	 * vite plugin, so `DocsShell` can render the in-page TOC server-side. The
	 * runtime TOC engine still owns scroll-spy and re-scans the DOM.
	 */
	toc?: { id: string; title: string; depth: 2 | 3 }[];
};

/**
 * One page's searchable record, emitted at build time by the `docsmith()` vite
 * plugin as the `svelte-docsmith/search` virtual module. `text` is the page's
 * prose and headings reduced to plain text (frontmatter, `<script>` blocks,
 * fenced code, tags, and markdown punctuation stripped) so a client-side search
 * index can be built over it without shipping raw markdown.
 */
export type SearchDoc = {
	path: string;
	title: string;
	section?: string;
	description?: string;
	/** The page's `h2`/`h3` heading text, for weighting title/heading matches. */
	headings: string[];
	/** Plain-text body: prose and headings, code and markup removed. */
	text: string;
};

/** A single sidebar link. */
export type NavItem = { title: string; url: string };

/** A titled group of sidebar links. */
export type NavGroup = { title: string; items: NavItem[] };

/**
 * Derive sidebar nav from a content collection: group by `section`, order by
 * `order` within a group, and order groups by the smallest `order` they
 * contain. Entries without a `section` fall under "Docs".
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
