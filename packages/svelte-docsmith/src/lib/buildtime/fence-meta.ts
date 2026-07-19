/**
 * Parse the metadata that follows a code fence's language:
 *
 * ```ts title="vite.config.ts" showLineNumbers startLine=12
 *
 * mdsvex hands this string to the highlighter as its third argument, so no
 * extra plumbing is needed to read it. Unknown entries are ignored rather than
 * rejected, so a fence never fails a build over an unrecognised flag.
 */

export type FenceMeta = {
	/** Filename or caption shown above the block. */
	title?: string;
	/** Whether to number the lines. `undefined` means "use the global default". */
	lineNumbers?: boolean;
	/** First line's number, for a snippet lifted out of a larger file. */
	startLine?: number;
};

/** `title="a b"`, `title='a b'`, or `title=a` (unquoted values stop at a space). */
const KEY_VALUE = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;

export function parseFenceMeta(meta?: string | null): FenceMeta {
	const result: FenceMeta = {};
	if (!meta) return result;

	for (const match of meta.matchAll(KEY_VALUE)) {
		const key = match[1];
		const value = match[2] ?? match[3] ?? match[4] ?? '';
		if (key === 'title') result.title = value;
		else if (key === 'startLine') {
			const parsed = Number.parseInt(value, 10);
			// A non-numeric or nonsensical startLine is ignored: numbering from an
			// accidental NaN is worse than numbering from 1.
			if (Number.isFinite(parsed) && parsed > 0) result.startLine = parsed;
		} else if (key === 'showLineNumbers' || key === 'lineNumbers') {
			result.lineNumbers = value !== 'false';
		}
	}

	// Bare flags, e.g. ```ts showLineNumbers
	const bare = meta.replace(KEY_VALUE, ' ').split(/\s+/).filter(Boolean);
	if (bare.includes('showLineNumbers') || bare.includes('lineNumbers')) result.lineNumbers = true;
	if (bare.includes('noLineNumbers')) result.lineNumbers = false;

	// Numbering from a given line is meaningless without a gutter to show it in.
	if (result.startLine !== undefined && result.lineNumbers === undefined) result.lineNumbers = true;

	return result;
}

/** Whether a fence opts into Twoslash: ```ts twoslash */
export function hasTwoslash(meta?: string | null): boolean {
	if (!meta) return false;
	return meta.replace(KEY_VALUE, ' ').split(/\s+/).includes('twoslash');
}
