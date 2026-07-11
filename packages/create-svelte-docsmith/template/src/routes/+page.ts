import { redirect } from '@sveltejs/kit';

// Send the site root to the first docs page. Replace this file with a
// `+page.svelte` if you'd rather have a custom landing page.
export function load() {
	redirect(307, '/docs/introduction');
}
