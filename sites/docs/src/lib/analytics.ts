import posthog from 'posthog-js';
import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_KEY } from '$app/env/public';

// PostHog for this docs site only (the library itself ships no analytics).
// Off unless PUBLIC_POSTHOG_KEY is set (see src/env.ts).
let started = false;

/** Start PostHog in the browser. Safe to call more than once. */
export function startAnalytics() {
	if (started || !PUBLIC_POSTHOG_KEY) return;
	// The theme builder renders /themes/preview in iframes: they'd count as
	// extra pageviews of a page no reader opened.
	if (window.parent !== window) return;
	started = true;
	posthog.init(PUBLIC_POSTHOG_KEY, {
		// A managed reverse proxy host keeps ad blockers from dropping events.
		api_host: PUBLIC_POSTHOG_HOST,
		ui_host: 'https://eu.posthog.com',
		// Captures pageviews on client-side navigation too, not only full loads.
		defaults: '2026-08-30'
	});
}

/** A reader's thumbs vote at the foot of a doc page. */
export function trackFeedback(vote: 'up' | 'down', path: string) {
	if (!started) return;
	posthog.capture('docs_page_feedback', { vote, path });
}
