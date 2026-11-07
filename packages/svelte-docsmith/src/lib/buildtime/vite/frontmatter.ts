import { load as loadYaml } from 'js-yaml';
import { splitFrontmatter } from '../markdown-source.js';

/**
 * What {@link parseFrontmatter} throws on frontmatter that isn't valid YAML,
 * its own class so a caller can tell a page saved mid-edit from a real
 * failure: the dev broken-link check waits out the one and prints the other.
 */
export class FrontmatterError extends Error {
	override name = 'FrontmatterError';
}

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
		data = loadYaml(frontmatter);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new FrontmatterError(`[svelte-docsmith] invalid YAML frontmatter in ${file}\n${reason}`, {
			cause: err
		});
	}
	return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}
