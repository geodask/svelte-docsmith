// The domain layer: framework-agnostic contracts and pure logic, with no
// runtime or build-time dependencies. Internal barrel — consumers that span
// several of these (e.g. the shell) import from here; the public surface is
// re-exported through `src/lib/index.ts`.
export {
	checkSite,
	type DocsmithSite,
	type DocsmithLink,
	type DocsmithFooterColumn,
	type DocsmithAnnouncement
} from './config.js';
export type {
	DocsContent,
	DocsContentItem,
	DocsCustomFields,
	SearchDoc,
	LlmsDoc
} from './content.js';
export {
	resolveVersions,
	activeVersion,
	currentVersion,
	scopeContent,
	mapPathToVersion,
	type DocsVersion,
	type DocsVersions,
	type ResolvedVersion
} from './version.js';
export {
	navFromContent,
	flattenNav,
	navTrail,
	type Breadcrumb,
	isNavGroup,
	type NavItem,
	type NavGroup,
	type NavNode
} from './nav.js';
export { isOutsidePath } from './outside-path.js';
export {
	resolveDocsPage,
	type ArchivedBanner,
	type DocsPageView,
	type HeaderLink,
	type VersionLink
} from './docs-page.js';
