/**
 * Build-time path derivations shared by the vite plugin and the maintenance CLI.
 * Both have to agree on where the docs live in URL space, and each deriving it
 * separately is how they drift.
 */
import path from 'node:path';

/**
 * The docs URL base, e.g. `/docs`, from the content directory's location under
 * the routes directory. This is the same mapping the collectors use to turn a
 * page's directory into its URL, so a page at `<routes>/docs/intro/+page.md` is
 * served at `/docs/intro` under a base of `/docs`.
 */
export function docsBaseFrom(routesDir: string, contentDir: string): string {
	return '/' + path.relative(routesDir, contentDir).split(path.sep).join('/');
}
