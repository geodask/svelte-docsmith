/**
 * Strip a trailing slash so route matching is consistent regardless of the
 * consumer's SvelteKit `trailingSlash` setting: `/docs/intro/` and `/docs/intro`
 * resolve to the same content entry. The root stays `/`.
 */
export function normalizePath(pathname: string): string {
	return pathname.replace(/\/+$/, '') || '/';
}
