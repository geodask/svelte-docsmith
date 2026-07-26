/**
 * The git queries the build makes: when a page last changed, and when each
 * release landed. Used by both the vite plugin and the `archive-version`
 * command, which is why it sits here rather than under `vite/`.
 *
 * Every date here is `%cs`, the commit's calendar day (`YYYY-MM-DD`), never a
 * timestamp. Dates from this module are rendered as a day and nothing more, and
 * a date-only string parses to UTC midnight, so pinning the formatter to UTC
 * renders the committer's own day identically for every reader and identically
 * on the server and the client. A full timestamp buys precision no consumer
 * uses and reintroduces the day-boundary drift.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/** Commit day (`YYYY-MM-DD`) a file last changed, or undefined outside a repo. */
export function lastCommitDate(file: string): string | undefined {
	const res = spawnSync('git', ['log', '-1', '--format=%cs', '--', file], {
		cwd: path.dirname(file),
		encoding: 'utf-8'
	});
	const date = res.status === 0 ? res.stdout.trim() : '';
	return date || undefined;
}

/**
 * Release dates keyed by version, read from the commit that introduced each
 * `## <version>` heading in a changelog. Changesets does not write dates, and a
 * tag lookup misses versions released before tagging was set up, so the file's
 * own history is the most reliable source available.
 */
export function changelogDates(file: string): Map<string, string> {
	const dates = new Map<string, string>();
	// `-L` would be per-line; instead walk the file's commits newest-first and
	// record the first commit in which each version heading appears.
	const log = spawnSync(
		'git',
		['log', '--format=%H %cs', '--reverse', '--follow', '--', path.basename(file)],
		{ cwd: path.dirname(file), encoding: 'utf-8' }
	);
	if (log.status !== 0) return dates;

	for (const line of log.stdout.trim().split('\n').filter(Boolean)) {
		const [hash, date] = line.split(' ');
		if (!hash || !date) continue;
		const show = spawnSync('git', ['show', `${hash}:./${path.basename(file)}`], {
			cwd: path.dirname(file),
			encoding: 'utf-8'
		});
		if (show.status !== 0) continue;
		for (const match of show.stdout.matchAll(/^##\s+(?!#)(.+?)\s*$/gm)) {
			const version = match[1].trim();
			// First commit containing this heading wins, which is its release.
			if (!dates.has(version)) dates.set(version, date);
		}
	}
	return dates;
}
