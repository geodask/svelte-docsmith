import yaml from 'js-yaml';
import { splitFrontmatter } from '../markdown-source.js';

/**
 * Parse a page's leading YAML frontmatter block into a plain object. Returns an
 * empty object when there is no frontmatter; throws a located error on invalid
 * YAML so a typo surfaces with its filename instead of a blank page.
 */
export function parseFrontmatter(source: string, file: string): Record<string, unknown> {
	const { frontmatter } = splitFrontmatter(source);
	if (frontmatter === undefined) return {};
	let data: unknown;
	try {
		data = yaml.load(frontmatter);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(`[svelte-docsmith] invalid YAML frontmatter in ${file}\n${reason}`);
	}
	return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}
