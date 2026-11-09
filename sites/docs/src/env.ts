import { defineEnvVars } from '@sveltejs/kit/env';

// Both optional: with no key the site sends no analytics (local dev, forks,
// preview deploys). Static, so the build inlines them into the prerendered site.
export const variables = defineEnvVars({
	PUBLIC_POSTHOG_KEY: {
		public: true,
		static: true,
		schema: (value) => value || undefined,
		description: "The docs site's PostHog project API key. Unset sends nothing."
	},
	PUBLIC_POSTHOG_HOST: {
		public: true,
		static: true,
		schema: (value) => value || 'https://eu.i.posthog.com',
		description: 'Where events go: a managed reverse proxy host, or the EU ingestion host.'
	}
});
