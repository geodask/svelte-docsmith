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

/**
 * Commit day (`YYYY-MM-DD`) every tracked file under `dir` last changed, keyed by
 * absolute path. One history walk rather than a `git log` per file: the per-file
 * form costs a process each, which is the build's largest single expense once a
 * site has more than a handful of pages.
 *
 * `--relative` makes git print paths relative to `dir`, so they join straight
 * back onto it with no second call to find the repository root. `--no-renames`
 * makes a rename list both of its paths, which keeps the answer identical to
 * asking about one file at a time.
 *
 * An empty map for a directory outside a repository, or one git could not read.
 * That is the same "no date" every caller already handles, and it is deliberately
 * all-or-nothing: a truncated read would date some pages and not others, which
 * looks like real data and is not.
 *
 * A directory outside a repository is a choice, so it passes quietly; a git that
 * ran and failed is not, and calls `onFail` so the caller can say so. Reporting
 * is the caller's to do, which is why this takes a callback rather than writing
 * to the console itself.
 */
export function commitDates(dir: string, onFail?: (reason: string) => void): Map<string, string> {
	const dates = new Map<string, string>();
	const res = spawnSync(
		'git',
		['log', '--format=%cs', '--name-only', '--relative', '--no-renames', '--', '.'],
		// A page list can outgrow the 1 MB default, and overflow truncates rather
		// than throws, so the cap is raised and the result checked below.
		{ cwd: dir, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }
	);
	// `error` means git ran and something went wrong with the read itself, most
	// likely the output exceeding maxBuffer. A non-zero status is the ordinary
	// "not a repository", which every caller already handles as no dates.
	if (res.error) onFail?.(res.error.message);
	if (res.error || res.status !== 0 || typeof res.stdout !== 'string') return dates;

	let date: string | undefined;
	for (const line of res.stdout.split('\n')) {
		if (!line) continue;
		if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
			date = line;
			continue;
		}
		// Newest commit first, so the first date a file appears under is its latest.
		const file = path.resolve(dir, line);
		if (date && !dates.has(file)) dates.set(file, date);
	}
	return dates;
}

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
