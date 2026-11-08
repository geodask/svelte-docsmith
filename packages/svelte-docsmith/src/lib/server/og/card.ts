/**
 * The OG image card: what one doc page's image shows, as the element tree
 * satori draws. Pure: no fonts, no rendering, so the layout is tested as data.
 */
import type { OgColours } from './colours.js';

/** The card's size, the 1.91:1 every link preview crops to. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** A satori element: the shape of a React element, without React. */
export type OgNode = {
	type: string;
	props: { style?: Record<string, string | number>; children?: OgChild | OgChild[] };
};
type OgChild = OgNode | string;

/** What one card shows. */
export type OgCard = {
	/** The site title, top left. */
	site: string;
	/** The page title, the card's headline. */
	title: string;
	/** The page description, under the title. */
	description?: string;
	/** Above the title: the page's section, and its version when archived. */
	eyebrow?: string;
	/** The site's host (`docs.example.com`), bottom left. */
	host?: string;
	colours: OgColours;
};

/** Longest title and description drawn before cutting with an ellipsis. */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 150;

function h(
	type: string,
	style: OgNode['props']['style'],
	children?: OgNode['props']['children']
): OgNode {
	return { type, props: children === undefined ? { style } : { style, children } };
}

/**
 * Cut text to at most `max` characters, at a word boundary when one is close,
 * ending in an ellipsis. Satori can clamp lines itself, but cutting first keeps
 * a long description from pushing the footer off the card.
 */
export function clip(text: string, max: number): string {
	const t = text.replace(/\s+/g, ' ').trim();
	if (t.length <= max) return t;
	const cut = t.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** The title's size: large for a short title, smaller as it grows. */
function titleSize(title: string): number {
	if (title.length <= 24) return 76;
	if (title.length <= 48) return 64;
	return 54;
}

/** A hex colour at an alpha, for the glow; any other colour is left opaque-free. */
function withAlpha(colour: string, alpha: number): string {
	if (!/^#[0-9a-f]{6}$/i.test(colour)) return 'transparent';
	return `${colour}${Math.round(alpha * 255)
		.toString(16)
		.padStart(2, '0')}`;
}

/** The element tree for one page's OG image. */
export function ogCard(card: OgCard): OgNode {
	const { colours } = card;
	const title = clip(card.title, TITLE_MAX);
	const description = card.description ? clip(card.description, DESCRIPTION_MAX) : undefined;

	const header = h('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
		h('div', {
			width: 28,
			height: 28,
			borderRadius: 7,
			backgroundColor: colours.primary
		}),
		h('div', { fontSize: 30, fontWeight: 700, color: colours.foreground }, clip(card.site, 48))
	]);

	const body: OgNode[] = [];
	if (card.eyebrow) {
		body.push(
			h(
				'div',
				{ fontSize: 26, fontWeight: 700, color: colours.primary, marginBottom: 20 },
				clip(card.eyebrow, 60)
			)
		);
	}
	body.push(
		h(
			'div',
			{
				fontSize: titleSize(title),
				fontWeight: 700,
				lineHeight: 1.1,
				letterSpacing: -1.5,
				color: colours.foreground
			},
			title
		)
	);
	if (description) {
		body.push(
			h('div', { fontSize: 30, lineHeight: 1.45, color: colours.muted, marginTop: 28 }, description)
		);
	}

	const footer = h(
		'div',
		{
			display: 'flex',
			borderTop: `1px solid ${colours.border}`,
			paddingTop: 28,
			fontSize: 24,
			color: colours.muted
		},
		card.host ?? ''
	);

	return h(
		'div',
		{
			// satori sizes boxes content-box unless told otherwise, which would add
			// the padding and border on top of the canvas.
			boxSizing: 'border-box',
			width: OG_WIDTH,
			height: OG_HEIGHT,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			padding: '64px 80px 56px',
			fontFamily: 'Inter',
			backgroundColor: colours.background,
			backgroundImage: `radial-gradient(circle at 100% 0%, ${withAlpha(colours.primary, 0.22)}, transparent 55%)`,
			borderTop: `10px solid ${colours.primary}`
		},
		[header, h('div', { display: 'flex', flexDirection: 'column', maxWidth: 1000 }, body), footer]
	);
}
