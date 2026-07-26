/**
 * Build-time path derivations shared by the vite plugin and the maintenance CLI.
 * Both have to agree on where the docs live in URL space, and each deriving it
 * separately is how they drift.
 */
import path from 'node:path';

/**
 * The URL a directory under the routes root is served at: `<routes>/docs/intro`
 * becomes `/docs/intro`. The routes root itself becomes `/`.
 */
export function urlFor(routesDir: string, dir: string): string {
	const rel = path.relative(routesDir, dir).split(path.sep).join('/');
	return '/' + rel;
}

/**
 * The docs URL base, e.g. `/docs`, from the content directory's location under
 * the routes directory. The same mapping a page's own directory goes through, so
 * a page at `<routes>/docs/intro/+page.md` is served at `/docs/intro` under a
 * base of `/docs`.
 */
export function docsBaseFrom(routesDir: string, contentDir: string): string {
	return urlFor(routesDir, contentDir);
}
