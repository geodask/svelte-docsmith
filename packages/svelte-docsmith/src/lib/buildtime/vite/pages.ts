import fs from 'node:fs';
import path from 'node:path';

const PAGE_NAMES = ['+page.md', '+page.svx'];

/** Whether a filename is a doc page the plugin should index. */
export function isPageFile(file: string): boolean {
	return PAGE_NAMES.some((name) => file.endsWith(name));
}

/**
 * List the absolute paths of every `+page.md`/`+page.svx` under `contentDir`.
 */
export function listPageFiles(contentDir: string): string[] {
	if (!fs.existsSync(contentDir)) return [];

	const entries = fs.readdirSync(contentDir, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !isPageFile(entry.name)) continue;
		const dir = entry.parentPath ?? (entry as { path?: string }).path ?? contentDir;
		files.push(path.join(dir, entry.name));
	}
	return files;
}
