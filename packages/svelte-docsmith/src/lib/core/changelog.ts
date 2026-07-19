/**
 * The record types for the generated changelog index. The `docsmith()` Vite
 * plugin parses your package's `CHANGELOG.md` at build time and emits these as
 * the `svelte-docsmith/changelog` virtual module, so every release becomes a
 * page and a feed entry without being written twice.
 */

/** One group of changes within a release, e.g. "Minor Changes". */
export type ChangelogGroup = {
	/** The group heading as written, e.g. `Minor Changes` or `Patch Changes`. */
	kind: string;
	/**
	 * Each entry's body as HTML, rendered from markdown at build time with the
	 * changeset's commit hash removed. HTML rather than markdown so a consuming
	 * site needs no runtime renderer.
	 */
	items: string[];
};

/** One released version. */
export type ChangelogRelease = {
	/** Version string as it appears in the changelog, e.g. `0.8.0`. */
	version: string;
	/** Release date (ISO) from the git history, when it can be determined. */
	date?: string;
	groups: ChangelogGroup[];
	/**
	 * A hand-written page for this release, when `src/routes/changelog/<version>/`
	 * exists. The generated entry is the fallback, so a release that deserves a
	 * proper write-up can have one without the rest going undocumented.
	 */
	path?: string;
};
