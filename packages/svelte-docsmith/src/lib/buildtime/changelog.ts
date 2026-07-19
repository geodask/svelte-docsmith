/**
 * Parse a Changesets-generated `CHANGELOG.md` into structured releases.
 *
 * The shape Changesets writes is stable:
 *
 *     # package-name
 *
 *     ## 0.8.0
 *
 *     ### Minor Changes
 *
 *     - 4a1b3d4: Add an announcement bar. …
 *
 *       A second paragraph, indented two spaces.
 *
 * Parsing that rather than asking authors to write release notes twice means
 * the changelog can never fall behind what actually shipped.
 */
import type { ChangelogRelease, ChangelogGroup } from '../core/changelog.js';

/** `- <7-or-more hex chars>: ` prefix that Changesets puts on each entry. */
const COMMIT_PREFIX = /^([-*])\s+[0-9a-f]{7,40}:\s*/;

/** Strip the leading `- ` (and any commit hash) from an entry's first line. */
function stripBullet(line: string): string {
	const withoutHash = line.replace(COMMIT_PREFIX, '');
	if (withoutHash !== line) return withoutHash;
	return line.replace(/^[-*]\s+/, '');
}

/**
 * De-indent an entry's continuation lines. Changesets indents them by two
 * spaces to keep them inside the list item; leaving that in would render them
 * as code blocks.
 */
function dedent(lines: string[]): string {
	return lines
		.map((line) => (line.startsWith('  ') ? line.slice(2) : line))
		.join('\n')
		.trim();
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
	const lines = markdown.split(/\r?\n/);
	const releases: ChangelogRelease[] = [];

	let release: ChangelogRelease | undefined;
	let group: ChangelogGroup | undefined;
	let entry: string[] | undefined;

	const flushEntry = () => {
		if (entry && group) {
			const text = dedent(entry);
			if (text) group.items.push(text);
		}
		entry = undefined;
	};
	const flushGroup = () => {
		flushEntry();
		if (group && release && group.items.length > 0) release.groups.push(group);
		group = undefined;
	};
	const flushRelease = () => {
		flushGroup();
		if (release) releases.push(release);
		release = undefined;
	};

	for (const line of lines) {
		const version = /^##\s+(?!#)(.+?)\s*$/.exec(line);
		if (version) {
			flushRelease();
			release = { version: version[1].trim(), groups: [] };
			continue;
		}

		const heading = /^###\s+(.+?)\s*$/.exec(line);
		if (heading && release) {
			flushGroup();
			group = { kind: heading[1].trim(), items: [] };
			continue;
		}

		if (!group) continue;

		// A new bullet at column zero starts an entry; anything else continues the
		// current one, which is how multi-paragraph changesets survive intact.
		if (/^[-*]\s+/.test(line)) {
			flushEntry();
			entry = [stripBullet(line)];
		} else if (entry) {
			entry.push(line);
		}
	}
	flushRelease();

	return releases;
}
