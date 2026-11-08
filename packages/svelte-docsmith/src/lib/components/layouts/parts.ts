/**
 * What each overridable part of `DocsShell` receives.
 *
 * An override is a snippet passed to `DocsShell` (`sidebar`, `toc`,
 * `pageHeader`, `pager`) that replaces one part inside the frame the shell
 * keeps. Each snippet gets one of these objects, and the built-in part it
 * replaces (`Sidebar`, `TableOfContents`, `PageHeader`, `Pager`) takes exactly
 * the same object as its props, so an override can wrap the default:
 * `{#snippet sidebar(props)}<Banner /><Sidebar {...props} />{/snippet}`.
 *
 * These are part of the 1.0 promise. They are deliberately small and made for
 * their part: the shell's resolved page view stays internal.
 */
import type { Breadcrumb, NavGroup, NavItem } from '#lib/core/index.js';
import type { TocItem } from '#lib/toc/index.js';

/** The `sidebar` override's argument and `Sidebar`'s props. */
export type SidebarProps = {
	/** The sidebar tree for the version being read, in reading order. */
	nav: NavGroup[];
};

/** The `toc` override's argument and `TableOfContents`' props. */
export type TableOfContentsProps = {
	/** The page's `h2` and `h3` headings, in page order. */
	items: TocItem[];
	/** The `id` of the heading in view, or `null` before the reader scrolls. */
	activeId: string | null;
};

/** The `pageHeader` override's argument and `PageHeader`'s props. */
export type PageHeaderProps = {
	/** The current path, trailing slash stripped. */
	path: string;
	/**
	 * The trail to the page: its groups (each linking to the group's first page),
	 * then the page itself as a final crumb without a `url`. Empty off a doc page.
	 */
	breadcrumbs: Breadcrumb[];
	/**
	 * Estimated reading time in whole minutes. Absent when `DocsShell`'s
	 * `readingTime` is `false` or the page has no estimate.
	 */
	readingMinutes?: number;
	/** Whether to offer the Copy page menu: `DocsShell`'s `copyPage` is on and this is a doc page. */
	copyPage: boolean;
};

/** The `pager` override's argument and `Pager`'s props. */
export type PagerProps = {
	/** The previous page in reading order. */
	prev?: NavItem;
	/** The next page in reading order. */
	next?: NavItem;
};
