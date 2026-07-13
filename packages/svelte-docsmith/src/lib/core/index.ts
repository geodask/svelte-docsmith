// The domain layer: framework-agnostic contracts and pure logic, with no
// runtime or build-time dependencies. Internal barrel — consumers that span
// several of these (e.g. the shell) import from here; the public surface is
// re-exported through `src/lib/index.ts`.
export {
	defineConfig,
	type DocsmithConfig,
	type DocsmithLink,
	type DocsmithFooterColumn,
	type DocsmithAnnouncement
} from './config.js';
export type { DocsContentItem, SearchDoc, LlmsDoc } from './content.js';
export {
	navFromContent,
	flattenNav,
	navTrail,
	isNavGroup,
	type NavItem,
	type NavGroup,
	type NavNode
} from './nav.js';
