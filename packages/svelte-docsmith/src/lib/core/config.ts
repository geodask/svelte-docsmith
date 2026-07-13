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

/** A thin announcement bar shown at the top of every page. */
export type DocsmithAnnouncement = {
	/** The message text. */
	text: string;
	/** Optional leading pill label, e.g. `'New'`, `'Beta'`, or a version. */
	tag?: string;
	/** Optional link the bar points to. */
	href?: string;
	/** Open the link in a new tab with `rel="noopener"`. */
	external?: boolean;
	/**
	 * Dismissal key. A dismissed bar stays dismissed until this value changes, so
	 * bump it (or edit `text`) when you post a new announcement. Defaults to the
	 * text itself.
	 */
	id?: string;
	/** Let readers dismiss the bar. Defaults to `true`. */
	dismissible?: boolean;
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
	/**
	 * Base URL for the "Edit this page" link, pointing at the directory that maps
	 * to your app's working directory in the repo, e.g.
	 * `https://github.com/you/repo/edit/main/apps/docs`. DocsShell appends each
	 * page's source path. Omit to hide the edit link.
	 */
	editUrl?: string;
	/** Optional GitHub URL; renders a link in the header when set. */
	github?: string;
	/** Optional version string, shown in the header (e.g. your library version). */
	version?: string;
	/** Optional logo image src; falls back to the built-in book mark. */
	logo?: string;
	/** Optional announcement bar shown at the top of every page. */
	announcement?: DocsmithAnnouncement;
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
	for (const key of [
		'github',
		'version',
		'logo',
		'description',
		'url',
		'ogImage',
		'editUrl'
	] as const) {
		if (config[key] !== undefined && typeof config[key] !== 'string') {
			throw new Error(`[svelte-docsmith] config.${key} must be a string when set.`);
		}
	}
	if (config.announcement !== undefined) {
		const a = config.announcement;
		if (typeof a !== 'object' || a === null) {
			throw new Error(
				'[svelte-docsmith] config.announcement must be an object ({ text, href?, id?, external?, dismissible? }).'
			);
		}
		if (typeof a.text !== 'string' || a.text.trim() === '') {
			throw new Error(
				'[svelte-docsmith] config.announcement.text is required and must be a string.'
			);
		}
		for (const key of ['tag', 'href', 'id'] as const) {
			if (a[key] !== undefined && typeof a[key] !== 'string') {
				throw new Error(`[svelte-docsmith] config.announcement.${key} must be a string when set.`);
			}
		}
		for (const key of ['external', 'dismissible'] as const) {
			if (a[key] !== undefined && typeof a[key] !== 'boolean') {
				throw new Error(`[svelte-docsmith] config.announcement.${key} must be a boolean when set.`);
			}
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
