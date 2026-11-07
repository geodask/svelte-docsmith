import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

// `/relative` is an outside path: served by something other than this app.
vi.mock('svelte-docsmith/site', () => ({ site: { title: 'My Docs' }, outside: ['/relative'] }));
import AnnouncementBar from './announcement-bar.svelte';

describe('AnnouncementBar', () => {
	// Kit's crawler skips a `rel="external"` link and the client router does a
	// full page load on it, so the bar can point at an outside path.
	it('marks a link under an outside path rel="external"', () => {
		render(AnnouncementBar, {
			props: { announcement: { text: 'Try the API', href: '/relative/api', dismissible: false } }
		});
		expect(screen.getByRole('link', { name: /Try the API/ })).toHaveAttribute('rel', 'external');
	});

	it('leaves a link the app serves unmarked', () => {
		render(AnnouncementBar, {
			props: { announcement: { text: 'Read the guide', href: '/relatives', dismissible: false } }
		});
		expect(screen.getByRole('link', { name: /Read the guide/ })).not.toHaveAttribute('rel');
	});

	it('keeps noopener on a link that opens in a new tab', () => {
		render(AnnouncementBar, {
			props: {
				announcement: {
					text: 'Release notes',
					href: 'https://github.com/o/r/releases',
					external: true,
					dismissible: false
				}
			}
		});
		expect(screen.getByRole('link', { name: /Release notes/ })).toHaveAttribute(
			'rel',
			'noopener noreferrer'
		);
	});
});
