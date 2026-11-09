import posthog from 'posthog-js';
import type { ReaderEventHandler } from 'svelte-docsmith';
import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_KEY } from '$app/env/public';

// PostHog for this docs site only (the library itself sends nothing). Off
// unless PUBLIC_POSTHOG_KEY is set (see src/env.ts). The root layout starts it
// for pageviews; `docsmith({ readerEvents })` in vite.config.ts names this
// module, so its default export receives the library's reader events.
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
		defaults: '2026-08-30',
		// No cookies, localStorage or sessionStorage, so no consent banner:
		// PostHog derives an anonymous daily ID server-side and drops the IP.
		// Needs "Cookieless tracking" on in the project, or events are dropped.
		cookieless_mode: 'always',
		disable_session_recording: true
	});
}

// The error page reports a 404 as it mounts, before the root layout's onMount
// has run, so the handler starts PostHog itself rather than relying on the
// layout having done it. Event names are the reader event types as they come.
const readerEvents: ReaderEventHandler = (event) => {
	startAnalytics();
	if (started) posthog.capture(event.type, event);
};

export default readerEvents;
