import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { parseChangelog } from '../changelog.js';
import { changelogDates } from './git.js';
import type { ChangelogRelease } from '../../core/changelog.js';

/**
 * Render an entry's markdown to HTML at build time. Changesets entries use
 * inline code, emphasis, links and nested lists, so shipping the raw markdown
 * would mean every consuming site needed a runtime renderer.
 */
function renderItem(markdown: string): string {
	return marked.parse(markdown, { async: false, gfm: true }).trim();
}

/**
 * Read a Changesets `CHANGELOG.md` into releases, dated from git history, and
 * linked to a hand-written page where one exists.
 *
 * `overridesDir` is scanned for directories named after a version
 * (`src/routes/changelog/0.9.0/`), so a release worth a proper write-up can
 * have one while the rest stay generated.
 */
export function collectReleases(
	changelogFile: string,
	overridesDir?: string,
	routePath = '/changelog'
): ChangelogRelease[] {
	if (!fs.existsSync(changelogFile)) return [];

	const releases = parseChangelog(fs.readFileSync(changelogFile, 'utf-8'));
	const dates = changelogDates(changelogFile);

	const overrides = new Set<string>();
	if (overridesDir && fs.existsSync(overridesDir)) {
		for (const entry of fs.readdirSync(overridesDir, { withFileTypes: true })) {
			if (entry.isDirectory()) overrides.add(entry.name);
		}
	}

	return releases.map((release) => {
		// Directory names can't contain the dots a version has on every platform,
		// so `0.9.0` may be written as `0-9-0`.
		const slug = release.version.replace(/\./g, '-');
		const override = overrides.has(release.version)
			? release.version
			: overrides.has(slug)
				? slug
				: undefined;
		return {
			...release,
			groups: release.groups.map((group) => ({
				...group,
				items: group.items.map(renderItem)
			})),
			...(dates.get(release.version) ? { date: dates.get(release.version) } : {}),
			...(override ? { path: `${routePath}/${override}` } : {})
		};
	});
}

/** Default location of a monorepo package's changelog, relative to the app. */
export function defaultChangelogPath(cwd = process.cwd()): string {
	return path.resolve(cwd, 'CHANGELOG.md');
}
