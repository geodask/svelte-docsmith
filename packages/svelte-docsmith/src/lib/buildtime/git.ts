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
 * A shallow clone also yields no dates. Its single commit introduces every
 * tracked file, so a walk would stamp every page with the same day — silent,
 * plausible, and wrong for both page footers and sitemap `<lastmod>`. Omitting
 * the date is legitimate; a uniform wrong date is not. Callers that need real
 * dates should build from a full clone (`fetch-depth: 0` in CI, unshallow on
 * the host).
 *
 * `onFail` fires for a truncated read or a shallow repository: those are the
 * cases that would otherwise produce dates that look real and are not. A
 * directory outside a repository, a missing directory, or a machine without git
 * all yield no dates quietly, which every caller already handles. Reporting is
 * the caller's to do, which is why this takes a callback rather than writing to
 * the console itself.
 */
export function commitDates(
	dir: string,
	onFail?: (reason: string) => void,
	/**
	 * Cap on the walk's output. The default is far above any real docs root; it is
	 * a parameter so the truncation path can be exercised without a repository
	 * large enough to produce 256 MB of history.
	 */
	maxBuffer = 256 * 1024 * 1024
): Map<string, string> {
	const dates = new Map<string, string>();
	// One cheap probe before the walk. On a shallow clone the walk would "work"
	// and return one day for every file — worse than failing, so refuse first.
	if (isShallowRepository(dir)) {
		onFail?.(
			'shallow clone: git history is incomplete, so commit dates would be wrong. ' +
				'Build from a full clone (e.g. actions/checkout fetch-depth: 0), or set lastUpdated in frontmatter.'
		);
		return dates;
	}
	const res = spawnSync(
		'git',
		['log', '--format=%cs', '--name-only', '--relative', '--no-renames', '--', '.'],
		// The 1 MB default would truncate rather than throw on a large history,
		// which is why the cap is raised and the result checked below.
		{ cwd: dir, encoding: 'utf-8', maxBuffer }
	);
	// `ENOBUFS` is the output outgrowing maxBuffer, which truncates rather than
	// throws and is the only failure that could leave a half-filled map. `ENOENT`
	// (no such directory, or no git installed) and a non-zero status ("not a
	// repository") both mean no dates at all, which is a state callers expect.
	if ((res.error as NodeJS.ErrnoException | undefined)?.code === 'ENOBUFS') {
		onFail?.(res.error!.message);
	}
	if (res.error || res.status !== 0) return dates;

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

/**
 * Whether `dir` sits in a shallow clone. Outside a repository, or when git is
 * missing, returns false so the walk's own failure path still owns that case.
 */
function isShallowRepository(dir: string): boolean {
	const res = spawnSync('git', ['rev-parse', '--is-shallow-repository'], {
		cwd: dir,
		encoding: 'utf-8'
	});
	return res.status === 0 && res.stdout.trim() === 'true';
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
