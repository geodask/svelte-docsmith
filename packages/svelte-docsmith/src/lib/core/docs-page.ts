/**
 * Docs page resolution: everything `DocsShell` needs to know about the page
 * being read, derived in one place from the content index, the version manifest
 * and the URL.
 *
 * Pure and framework-agnostic, so each rule is a field with a test rather than
 * a derivation whose only test surface is a rendered tree. The view returns
 * data, never formatted strings: locale formatting and copy stay in the
 * component that renders them.
 */
import type { DocsContentItem } from './content.js';
import { navFromContent, flattenNav, navTrail, type NavGroup, type NavItem } from './nav.js';
import {
	activeVersion,
	currentVersion,
	mapPathToVersion,
	scopeContent,
	type ResolvedVersion
} from './version.js';
import { normalizePath } from '../utils/normalize-path.js';

/** The page's build-time headings, as extracted into the content index. */
type PageToc = NonNullable<DocsContentItem['toc']>;

/** One declared version, and where switching to it should take the reader. */
export type VersionLink = {
	id: string;
	label: string;
	/** This page under that version, or its landing when the page isn't there. */
	href: string;
	/** Whether this is the version being read. */
	active: boolean;
};

/** Everything `DocsShell` renders about the current page. */
export type DocsPageView = {
	/** The current path, trailing slash stripped. Match content against this. */
	pathname: string;
	/**
	 * The version owning the page, falling back to the current version off the
	 * docs tree (e.g. a `page` layout). `undefined` on an unversioned site.
	 */
	activeVersion: ResolvedVersion | undefined;
	/** {@link activeVersion}'s id, for scoping search. */
	activeVersionId: string | undefined;
	/** The current version, for the archived-version banner's "latest" link. */
	currentVersion: ResolvedVersion | undefined;
	/** Whether the page belongs to an archived (frozen) version. */
	isArchived: boolean;
	/** The content index scoped to {@link activeVersion}. */
	scopedContent: DocsContentItem[];
	/** Sidebar nav built from {@link scopedContent}. */
	nav: NavGroup[];
	/** The scoped content entry for this route, if the page is a doc page. */
	entry: DocsContentItem | undefined;
	/** "Edit this page" target. Absent without an edit base, or when archived. */
	editHref: string | undefined;
	/** The page's last commit date, unformatted. Absent if missing or unparseable. */
	lastUpdated?: Date;
	/** Estimated reading time in whole minutes, uncopied. */
	readingMinutes?: number;
	/** Previous page in sidebar reading order. */
	prev: NavItem | undefined;
	/** Next page in sidebar reading order. */
	next: NavItem | undefined;
	/** The page's nav title, falling back to the site title off the nav tree. */
	title: string;
	/**
	 * Breadcrumb titles: the page's group trail, then the page itself. Titles
	 * only, so this layer never depends on a component's `Crumb` type.
	 */
	breadcrumbs: string[];
	/** The page's server-rendered TOC, from {@link entry}. */
	toc: PageToc;
	/**
	 * Every declared version with the URL that keeps the reader on this page, in
	 * switcher order. Empty on an unversioned site, so the switcher and the
	 * archived-version banner both render off this one list.
	 */
	versionLinks: VersionLink[];
};

/**
 * Resolve the page being read. `pathname` is taken raw (normalized here, so the
 * caller has one fewer place to remember) and every field is derived from the
 * same normalized path and the same scoped content, so the sidebar, prev/next,
 * breadcrumbs and TOC can never disagree about which page or version is active.
 */
export function resolveDocsPage(input: {
	content: DocsContentItem[];
	versions: ResolvedVersion[];
	pathname: string;
	editUrl?: string;
	siteTitle: string;
}): DocsPageView {
	const { content, versions, editUrl, siteTitle } = input;
	const pathname = normalizePath(input.pathname);

	// Off the docs tree there is no owning version, so fall back to the current
	// one: a `page` layout still gets the current sidebar and search scope.
	const active =
		activeVersion(versions, pathname) ?? (versions.length ? currentVersion(versions) : undefined);
	const current = currentVersion(versions);
	// An archived version is frozen, so don't invite edits to it.
	const isArchived = Boolean(active && !active.current);

	const scopedContent = scopeContent(content, active?.id);
	const nav = navFromContent(scopedContent);
	const entry = scopedContent.find((item) => item.path === pathname);

	const flatNav = flattenNav(nav);
	const pageIndex = flatNav.findIndex((item) => item.url === pathname);
	const title = pageIndex >= 0 ? flatNav[pageIndex].title : siteTitle;

	const breadcrumbs = navTrail(nav, pathname) ?? [];
	if (pageIndex >= 0) breadcrumbs.push(title);

	return {
		pathname,
		activeVersion: active,
		activeVersionId: active?.id,
		currentVersion: current,
		isArchived,
		scopedContent,
		nav,
		entry,
		editHref:
			editUrl && entry?.sourcePath && !isArchived
				? editUrl.replace(/\/$/, '') + '/' + entry.sourcePath
				: undefined,
		lastUpdated: parseDate(entry?.lastUpdated),
		readingMinutes: entry?.readingTime,
		prev: pageIndex > 0 ? flatNav[pageIndex - 1] : undefined,
		next: pageIndex >= 0 && pageIndex < flatNav.length - 1 ? flatNav[pageIndex + 1] : undefined,
		title,
		breadcrumbs,
		toc: entry?.toc ?? [],
		versionLinks: active
			? versions.map((version) => ({
					id: version.id,
					label: version.label,
					// Switching to the version already being read is a no-op, so its
					// link is this page. Mapping it like the others would send a reader
					// who is off the docs tree to the docs landing instead.
					href:
						version.id === active.id
							? pathname
							: mapPathToVersion(
									pathname,
									active,
									version,
									scopeContent(content, version.id).map((item) => item.path)
								),
					active: version.id === active.id
				}))
			: []
	};
}

/**
 * A `YYYY-MM-DD` day as a Date, or `undefined` when absent or unparseable. The
 * result is UTC midnight, so it must be formatted in UTC to read back as the
 * same day.
 */
function parseDate(iso: string | undefined): Date | undefined {
	if (!iso) return undefined;
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? undefined : date;
}
