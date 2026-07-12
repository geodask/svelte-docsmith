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
