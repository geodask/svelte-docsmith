/**
 * `<SectionCards />` in agent markdown. The page renders the cards from the
 * content index, so the tag as written says nothing an agent can follow. Here
 * each tag starting a line is replaced by the same cards written as a list of
 * links, from the same pages: the page's own version, in reading order.
 */
import { outsideCodeFenceRuns } from '../markdown-source.js';
import { relativeToCwd } from '../paths.js';
import { sectionCards, type SectionPage } from '../../core/section-cards.js';

/** `<SectionCards …/>` (or with an empty body) starting a line; group 2 is its attributes. */
const TAG =
	/^([ \t]*)<SectionCards\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>\s*<\/SectionCards\s*>)[ \t]*$/gm;

/** `section="…"`, `section='…'` or `section={…}`. */
const SECTION = /(?:^|\s)section\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^{}]*)\})/;

/** A string literal inside a braced value. */
const STRING = /"([^"\\]*)"|'([^'\\]*)'|`([^`\\$]*)`/g;

/**
 * Write out each `<SectionCards />` in `content` as a list of links, the way
 * the page renders them. `page` is the page being written, `pages` every page
 * of its version. A `section` value that isn't literal strings can't be read
 * here, so that tag is kept as written, with a warning.
 */
export function writeSectionCards(
	content: string,
	page: SectionPage & { file: string },
	pages: SectionPage[],
	warn: (message: string) => void
): string {
	if (!content.includes('<SectionCards')) return content;
	return outsideCodeFenceRuns(content, (prose) =>
		prose.replace(TAG, (tag, indent: string, attributes: string) => {
			const section = sectionOf(attributes);
			if (section === null) {
				warn(
					`${relativeToCwd(page.file)}: could not read the \`section\` of ${tag.trim()}, ` +
						`so agent markdown keeps the tag. Write it as a string or an array of strings.`
				);
				return tag;
			}
			const cards = sectionCards(pages, section ?? page.section, page.path);
			// The page renders nothing for an empty section, and so does this.
			return cards
				.map(
					(card) =>
						`${indent}- [${card.title}](${card.href})` +
						(card.description ? `: ${card.description}` : '')
				)
				.join('\n');
		})
	);
}

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
