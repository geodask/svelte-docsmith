/**
 * `<SectionCards />` in agent markdown. The page renders the cards from the
 * content index, so the tag as written says nothing an agent can follow. Here
 * the tag is written out as the same cards, as a list of links, from the same
 * pages: the page's own version, in reading order.
 */
import { relativeToCwd } from '../paths.js';
import { sectionCards } from '../../core/section-cards.js';
import type { TagRewrite } from './agent-markdown.js';

/** `section="…"`, `section='…'` or `section={…}`. */
const SECTION = /(?:^|\s)section\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^{}]*)\})/;

/** A string literal inside a braced value. */
const STRING = /"([^"\\]*)"|'([^'\\]*)'|`([^`\\$]*)`/g;

/**
 * `<SectionCards />` written out as a list of links, the way the page renders
 * the cards. A `section` value that isn't literal strings can't be read here,
 * so that tag is kept as written, with a warning; so is a tag with anything
 * between its open and close tags, which the component doesn't take.
 */
export const sectionCardsRewrite: TagRewrite = {
	tag: 'SectionCards',
	write(tag, page) {
		if (tag.body?.trim()) return undefined;
		const section = sectionOf(tag.attributes);
		if (section === null) {
			page.warn(
				`${relativeToCwd(page.file)}: could not read the \`section\` of ${tag.raw.trim()}, ` +
					`so agent markdown keeps the tag. Write it as a string or an array of strings.`
			);
			return undefined;
		}
		const cards = sectionCards(page.pages, section ?? page.section, page.path);
		// The page renders nothing for an empty section, and so does this.
		return cards
			.map(
				(card) =>
					`${tag.indent}- [${card.title}](${card.href})` +
					(card.description ? `: ${card.description}` : '')
			)
			.join('\n');
	}
};

/**
 * The `section` attribute's value: `undefined` when there is none, `null` when
 * it is an expression that isn't a string or an array of strings.
 */
function sectionOf(attributes: string): string | string[] | undefined | null {
	const match = SECTION.exec(attributes);
	if (!match) return undefined;
	const [, double, single, braced] = match;
	if (braced === undefined) return double ?? single;
	const value = braced.trim();
	const strings = [...value.matchAll(STRING)].map((m) => m[1] ?? m[2] ?? m[3]);
	const rest = value.replace(STRING, '').replace(/[\s,]/g, '');
	if (strings.length === 1 && rest === '') return strings[0];
	if (strings.length > 0 && rest === '[]') return strings;
	return null;
}
