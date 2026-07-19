import { spawnSync } from 'node:child_process';
import path from 'node:path';

/** Last git commit date (strict ISO) for a file, or undefined outside a repo. */
export function lastCommitDate(file: string): string | undefined {
	const res = spawnSync('git', ['log', '-1', '--format=%cI', '--', file], {
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
		['log', '--format=%H %cI', '--reverse', '--follow', '--', path.basename(file)],
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
