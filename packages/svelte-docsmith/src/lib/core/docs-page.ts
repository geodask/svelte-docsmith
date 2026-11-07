/**
 * Docs page resolution: everything `DocsShell` and its chrome need to know about
 * the page being read, derived in one place from the content index, the version
 * manifest, the site config and the URL.
 *
 * Pure and framework-agnostic, so each rule is a field with a test rather than
 * a derivation whose only test surface is a rendered tree. The view returns
 * data, never formatted strings: locale formatting and copy stay in the
 * component that renders them.
 */
import type { DocsmithLink, DocsmithSite } from './config.js';
import type { DocsContentItem } from './content.js';
import {
	navFromContent,
	flattenNav,
	navTrail,
	type Breadcrumb,
	type NavGroup,
	type NavItem
} from './nav.js';
import {
	activeVersion,
	currentVersion,
	mapPathToVersion,
	scopeContent,
	type ResolvedVersion
} from './version.js';
import { firstSegmentUnder, join, normalizePath, under } from '../utils/url.js';

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

/** A `site.nav` link, with whether the page being read sits in its section. */
export type HeaderLink = DocsmithLink & {
	/** Whether to mark this link as the current section (`aria-current`). */
	active: boolean;
};

/** The archived-version banner: what the reader is on, and the way out. */
export type ArchivedBanner = {
	/** The archived version being read. */
	active: ResolvedVersion;
	/** The current version the banner points to. */
	current: ResolvedVersion;
	/** This page under the current version: the switcher's link for it. */
	href: string;
};

/** Everything `DocsShell` and its chrome render about the current page. */
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
	 * Breadcrumb trail: group steps (with a jump URL to the group's first page),
	 * then the current page as a title-only final crumb. No component types
	 * here — the shell maps this onto its `Crumb` shape.
	 */
	breadcrumbs: Breadcrumb[];
	/** The page's server-rendered TOC, from {@link entry}. */
	toc: PageToc;
	/**
	 * Every declared version with the URL that keeps the reader on this page, in
	 * switcher order. Empty on an unversioned site, so the switcher and the
	 * archived-version banner both render off this one list.
	 */
	versionLinks: VersionLink[];
	/**
	 * The archived-version banner, or `undefined` off an archive. Its link is
	 * the current version's entry in {@link versionLinks}, so the banner and the
	 * switcher can't disagree about where the reader lands.
	 */
	archivedBanner: ArchivedBanner | undefined;
	/**
	 * `site.nav` in order, each marked active or not. Both headers render this
	 * one list, so they can't disagree about which section is current. Two
	 * links may share an `href`, so render it keyed by position.
	 */
	headerLinks: HeaderLink[];
	/**
	 * "Open an issue" target for the feedback widget, prefilled with the page
	 * title and path. Absent off a doc page, and without a `site.github` that
	 * names a repository (an account URL has no issues to open).
	 */
	issueHref: string | undefined;
	/**
	 * Absolute canonical URL of this page. Absent without `site.url`: a relative
	 * canonical would claim every page under whatever host served it.
	 */
	canonicalUrl: string | undefined;
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
	site: DocsmithSite;
}): DocsPageView {
	const { content, versions, site } = input;
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
	const title = pageIndex >= 0 ? flatNav[pageIndex].title : site.title;

	const breadcrumbs: Breadcrumb[] = navTrail(nav, pathname) ?? [];
	if (pageIndex >= 0) breadcrumbs.push({ title });

	const versionLinks: VersionLink[] = active
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
		: [];

	const currentHref = current && versionLinks.find((link) => link.id === current.id)?.href;
	const archivedBanner =
		isArchived && active && current && currentHref
			? { active, current, href: currentHref }
			: undefined;

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
			site.editUrl && entry?.sourcePath && !isArchived
				? join(site.editUrl, entry.sourcePath)
				: undefined,
		lastUpdated: parseDate(entry?.lastUpdated),
		readingMinutes: entry?.readingTime,
		prev: pageIndex > 0 ? flatNav[pageIndex - 1] : undefined,
		next: pageIndex >= 0 && pageIndex < flatNav.length - 1 ? flatNav[pageIndex + 1] : undefined,
		title,
		breadcrumbs,
		toc: entry?.toc ?? [],
		versionLinks,
		archivedBanner,
		headerLinks: (site.nav ?? []).map((link) => ({
			...link,
			active: isActiveLink(link, pathname)
		})),
		issueHref: entry ? feedbackIssueHref(site.github, entry.title, pathname) : undefined,
		canonicalUrl: site.url ? join(site.url, pathname) : undefined
	};
}

/**
 * Whether a header link owns the section `pathname` is in. A header link is
 * usually the entry point to a whole section rather than a page you sit on:
 * "Docs" points at `/docs/introduction`, and should stay lit while the reader
 * moves through `/docs/*`. So match the link's first segment, not the exact
 * path. The root is exempt, since every path starts with `/`.
 */
function isActiveLink(link: DocsmithLink, pathname: string): boolean {
	if (link.external) return false;
	// `href` is only required to be a string, so anchor it at the site root:
	// `docs/intro` has to light the same section as `/docs/intro`.
	const href = normalizePath(join('/', link.href));
	if (href === pathname) return true;
	// No first segment means the link is the root, or is not a site path at all
	// (an absolute URL left unflagged), and owns no section either way.
	const segment = firstSegmentUnder(href, '/');
	if (!segment) return false;
	return under(pathname, '/' + segment);
}

/**
 * A new GitHub issue on the repository `github` points into, prefilled to say
 * which page the feedback is about. `github` is only documented as "a GitHub
 * URL", so it may carry a trailing slash, a `.git`, a subpath (`/tree/main`),
 * a query or a hash; only its owner and repository segments are kept. Without
 * both (an account URL, or not a URL at all) there is no issue to open.
 */
function feedbackIssueHref(
	github: string | undefined,
	title: string,
	pathname: string
): string | undefined {
	if (!github) return undefined;
	let url: URL;
	try {
		url = new URL(github);
	} catch {
		return undefined;
	}
	const [owner, repo] = url.pathname.split('/').filter(Boolean);
	if (!owner || !repo) return undefined;
	const issueTitle = encodeURIComponent(`Feedback: ${title}`);
	const body = encodeURIComponent(`Page: ${pathname}\n\n<!-- What was unclear or missing? -->\n`);
	return `${url.origin}/${owner}/${repo.replace(/\.git$/, '')}/issues/new?title=${issueTitle}&body=${body}`;
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
