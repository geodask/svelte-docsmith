import type { ChangelogRelease } from '../core/changelog.js';
import { join } from '../utils/url.js';
import { escapeXml } from './xml.js';

/** Site details the feed needs beyond the releases themselves. */
export type FeedSite = {
	/** Canonical origin, e.g. `https://docs.example.com`. */
	url: string;
	/** Feed title, usually the site title. */
	title: string;
	/** One-line feed description. */
	description?: string;
	/**
	 * Path the changelog lives at. Default: `/changelog`. Joined to the origin with
	 * exactly one slash between, so the leading slash is optional.
	 */
	path?: string;
};

/** A release's entries flattened to plain text, grouped by kind. */
function summarise(release: ChangelogRelease): string {
	return release.groups
		.map((group) => `${group.kind}\n\n${group.items.map((item) => `- ${item}`).join('\n\n')}`)
		.join('\n\n');
}

/**
 * Build an Atom feed body from parsed changelog releases. Framework-agnostic:
 * wire it into a SvelteKit `src/routes/changelog.xml/+server.ts` over the
 * generated `svelte-docsmith/changelog` index.
 *
 * ```ts
 * import { releases } from 'svelte-docsmith/changelog';
 * import { generateFeed } from 'svelte-docsmith';
 *
 * export const prerender = true;
 * export function GET() {
 *   const body = generateFeed(releases, {
 *     url: 'https://my-docs.dev',
 *     title: 'My Library'
 *   });
 *   return new Response(body, { headers: { 'content-type': 'application/atom+xml' } });
 * }
 * ```
 *
 * Atom rather than RSS because it requires an unambiguous per-entry id and
 * update timestamp, which is exactly what a version and its release date give.
 */
export function generateFeed(releases: ChangelogRelease[], site: FeedSite): string {
	const path = site.path ?? '/changelog';
	const changelogUrl = join(site.url, path);
	const feedUrl = `${changelogUrl}.xml`;
	// A feed needs an updated timestamp; fall back to now when no release
	// carries a date, so the document stays valid.
	const updated = releases.find((r) => r.date)?.date ?? new Date().toISOString();

	const entries = releases
		.map((release) => {
			const link = release.path
				? join(site.url, release.path)
				: `${changelogUrl}#${release.version}`;
			return [
				'\t<entry>',
				`\t\t<title>${escapeXml(release.version)}</title>`,
				`\t\t<id>${escapeXml(link)}</id>`,
				`\t\t<link href="${escapeXml(link)}" />`,
				`\t\t<updated>${escapeXml(release.date ?? updated)}</updated>`,
				`\t\t<content type="text">${escapeXml(summarise(release))}</content>`,
				'\t</entry>'
			].join('\n');
		})
		.join('\n');

	return [
		'<?xml version="1.0" encoding="utf-8"?>',
		'<feed xmlns="http://www.w3.org/2005/Atom">',
		`\t<title>${escapeXml(site.title)}</title>`,
		site.description ? `\t<subtitle>${escapeXml(site.description)}</subtitle>` : '',
		`\t<id>${escapeXml(feedUrl)}</id>`,
		`\t<link href="${escapeXml(changelogUrl)}" />`,
		`\t<link rel="self" href="${escapeXml(feedUrl)}" />`,
		`\t<updated>${escapeXml(updated)}</updated>`,
		entries,
		'</feed>'
	]
		.filter(Boolean)
		.join('\n');
}
