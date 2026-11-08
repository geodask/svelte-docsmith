/**
 * The site config: the `site` options of `docsmith()`, which the plugin checks
 * at startup and serves as `svelte-docsmith/site` for `DocsShell`, `ErrorPage`
 * and the route handlers to read. Content-derived data (the sidebar nav) is
 * NOT here — it comes from the content index.
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

export type DocsmithSite = {
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
	/**
	 * Path of the site's MCP server, e.g. `/mcp` (or an absolute URL). When set,
	 * the copy-page menu offers "Connect to your editor" with the server's URL
	 * and setup for Claude Code, Cursor and VS Code, and `llmsTxt()` lists it.
	 * The route itself is yours to add, with `mcpServer()` from
	 * `svelte-docsmith/server`.
	 *
	 * @experimental Outside the 1.0 stability promise. May change in a minor.
	 */
	mcp?: string;
	/** Optional GitHub URL; renders a link in the header when set. */
	github?: string;
	/**
	 * Show the repo's star count beside the header GitHub link. Read from the
	 * GitHub API once per build (and once per `dev` start) when `github` is a
	 * `https://github.com/{owner}/{repo}` URL, using `GITHUB_TOKEN` when set.
	 * Defaults to `true`; set `false` to skip the fetch and show the bare link.
	 */
	githubStars?: boolean;
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
 * Check the `site` options when the plugin starts, so a mistyped or
 * dynamically-built config fails `dev` and `build` with a real error message
 * instead of a blank header. The site is served to the browser, so it must
 * also be plain data: see {@link assertPlainData}.
 */
export function checkSite(site: DocsmithSite): DocsmithSite {
	if (typeof site !== 'object' || site === null) {
		throw new Error(
			"[svelte-docsmith] docsmith() needs a `site` object, e.g. docsmith({ site: { title: 'My Docs' } })."
		);
	}
	if (typeof site.title !== 'string' || site.title.trim() === '') {
		throw new Error(
			'[svelte-docsmith] site.title is required — the site title shown in the sidebar header.'
		);
	}
	for (const key of [
		'github',
		'version',
		'logo',
		'description',
		'url',
		'ogImage',
		'editUrl',
		'mcp'
	] as const) {
		if (site[key] !== undefined && typeof site[key] !== 'string') {
			throw new Error(`[svelte-docsmith] site.${key} must be a string when set.`);
		}
	}
	if (site.githubStars !== undefined && typeof site.githubStars !== 'boolean') {
		throw new Error('[svelte-docsmith] site.githubStars must be a boolean when set.');
	}
	if (site.announcement !== undefined) {
		const a = site.announcement;
		if (typeof a !== 'object' || a === null) {
			throw new Error(
				'[svelte-docsmith] site.announcement must be an object ({ text, href?, id?, external?, dismissible? }).'
			);
		}
		if (typeof a.text !== 'string' || a.text.trim() === '') {
			throw new Error('[svelte-docsmith] site.announcement.text is required and must be a string.');
		}
		for (const key of ['tag', 'href', 'id'] as const) {
			if (a[key] !== undefined && typeof a[key] !== 'string') {
				throw new Error(`[svelte-docsmith] site.announcement.${key} must be a string when set.`);
			}
		}
		for (const key of ['external', 'dismissible'] as const) {
			if (a[key] !== undefined && typeof a[key] !== 'boolean') {
				throw new Error(`[svelte-docsmith] site.announcement.${key} must be a boolean when set.`);
			}
		}
	}
	if (site.nav !== undefined) {
		if (!Array.isArray(site.nav)) {
			throw new Error('[svelte-docsmith] site.nav must be an array of { label, href } links.');
		}
		for (const link of site.nav) {
			if (typeof link?.label !== 'string' || typeof link?.href !== 'string') {
				throw new Error('[svelte-docsmith] each site.nav entry needs a string `label` and `href`.');
			}
		}
	}
	if (site.footer !== undefined) {
		if (typeof site.footer !== 'object' || site.footer === null) {
			throw new Error(
				'[svelte-docsmith] site.footer must be an object ({ copyright?, columns?, poweredBy? }).'
			);
		}
		const { copyright, columns, poweredBy } = site.footer;
		if (copyright !== undefined && typeof copyright !== 'string') {
			throw new Error('[svelte-docsmith] site.footer.copyright must be a string when set.');
		}
		if (poweredBy !== undefined && typeof poweredBy !== 'boolean') {
			throw new Error('[svelte-docsmith] site.footer.poweredBy must be a boolean when set.');
		}
		if (columns !== undefined) {
			if (!Array.isArray(columns)) {
				throw new Error(
					'[svelte-docsmith] site.footer.columns must be an array of { title, links } columns.'
				);
			}
			for (const column of columns) {
				if (typeof column?.title !== 'string') {
					throw new Error(
						'[svelte-docsmith] each site.footer.columns entry needs a string `title`.'
					);
				}
				if (!Array.isArray(column.links)) {
					throw new Error(
						`[svelte-docsmith] site.footer column "${column.title}" needs a \`links\` array.`
					);
				}
				for (const link of column.links) {
					if (typeof link?.label !== 'string' || typeof link?.href !== 'string') {
						throw new Error(
							`[svelte-docsmith] each link in site.footer column "${column.title}" needs a string \`label\` and \`href\`.`
						);
					}
				}
			}
		}
	}
	assertPlainData(site, 'site');
	return site;
}

/**
 * Throw unless `value` survives `JSON.stringify` unchanged: strings, finite
 * numbers, booleans, `null`, arrays and plain objects, with `undefined` allowed
 * as an object value (it is dropped, like an unset key). The site config is
 * served to the browser as JSON, so a function, class instance or `Date` in it
 * would arrive changed or not at all.
 */
export function assertPlainData(value: unknown, at: string): void {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
	if (typeof value === 'number' && Number.isFinite(value)) return;
	if (Array.isArray(value)) {
		value.forEach((item, i) => assertPlainData(item, `${at}[${i}]`));
		return;
	}
	if (typeof value === 'object') {
		const proto = Object.getPrototypeOf(value);
		if (proto === Object.prototype || proto === null) {
			for (const [key, item] of Object.entries(value)) {
				if (item !== undefined) assertPlainData(item, `${at}.${key}`);
			}
			return;
		}
	}
	const kind =
		typeof value === 'object' ? (value.constructor?.name ?? 'object') : String(typeof value);
	throw new Error(
		`[svelte-docsmith] ${at} is a ${kind}, but the site config is sent to the browser as JSON, so it must be plain data (strings, numbers, booleans, arrays and plain objects).`
	);
}
