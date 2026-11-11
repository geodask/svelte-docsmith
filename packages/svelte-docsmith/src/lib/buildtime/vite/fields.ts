/**
 * The built-in fields: the frontmatter keys svelte-docsmith reads itself, each
 * with the one reader that decides what a valid value is. Every other key is a
 * custom field, carried as written.
 *
 * One table, read three ways: the index builders project a page through these
 * readers, the frontmatter check reports a set key whose reader returns
 * `undefined`, and custom fields are whatever the table doesn't name. Spelling a
 * rule twice is how the checker and the indexes came to disagree about what
 * `order: Infinity` or `section: [Guides, 3]` means.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const readString = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** A built-in field: how to read it, and how to name what it expects. */
type BuiltinField<T> = { read: (value: unknown) => T | undefined; expected: string };

export const BUILTIN_FIELDS = {
	title: { read: readString, expected: 'a string' },
	description: { read: readString, expected: 'a string' },
	/** A string is one sidebar group; a list of strings is a nested group path. */
	section: {
		read: (value: unknown): string | string[] | undefined => {
			if (typeof value === 'string') return value;
			const isPath =
				Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string');
			return isPath ? (value as string[]) : undefined;
		},
		expected: 'a string or a list of strings'
	},
	order: {
		read: (value: unknown) =>
			typeof value === 'number' && Number.isFinite(value) ? value : undefined,
		expected: 'a number'
	},
	lastUpdated: {
		read: (value: unknown) =>
			typeof value === 'string' && ISO_DAY.test(value) ? value : undefined,
		expected: 'a YYYY-MM-DD date'
	},
	/**
	 * The release the page first appeared in, as written. YAML reads an
	 * unquoted `0.15` as a number, which is taken as its text; one that loses
	 * a digit that way (`1.10`) needs quotes.
	 */
	since: {
		read: (value: unknown) => {
			if (typeof value === 'number' && Number.isFinite(value)) return String(value);
			return typeof value === 'string' && value.trim() ? value.trim() : undefined;
		},
		expected: "a version, like '0.15'"
	}
} satisfies Record<string, BuiltinField<unknown>>;

export type BuiltinKey = keyof typeof BUILTIN_FIELDS;

const isBuiltin = (key: string): key is BuiltinKey => Object.hasOwn(BUILTIN_FIELDS, key);

/** A built-in field's value, when the page sets it to something valid. */
export function readField<K extends BuiltinKey>(
	frontmatter: Record<string, unknown>,
	key: K
): ReturnType<(typeof BUILTIN_FIELDS)[K]['read']> {
	return BUILTIN_FIELDS[key].read(frontmatter[key]) as ReturnType<
		(typeof BUILTIN_FIELDS)[K]['read']
	>;
}

/** The built-in fields a page sets to something no reader accepts. */
export function invalidFields(
	frontmatter: Record<string, unknown>
): { key: BuiltinKey; expected: string }[] {
	return Object.keys(frontmatter)
		.filter(isBuiltin)
		.filter((key) => BUILTIN_FIELDS[key].read(frontmatter[key]) === undefined)
		.map((key) => ({ key, expected: BUILTIN_FIELDS[key].expected }));
}

/** A page's custom fields: every key the table doesn't name, as written. */
export function customFields(frontmatter: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(frontmatter).filter(([key]) => !isBuiltin(key)));
}

/**
 * The built-in field a custom key was probably meant to be: one edit away
 * (`ordr`, `tilte`, `sections`) or the same key in another case (`Title`).
 * A built-in with one letter in front is taken as its own word, so `border`
 * is not read as `order`.
 */
export function likelyTypoOf(key: string): BuiltinKey | undefined {
	const lower = key.toLowerCase();
	return (Object.keys(BUILTIN_FIELDS) as BuiltinKey[]).find((builtin) => {
		if (builtin.toLowerCase() === lower) return true;
		const prefixed =
			lower.length === builtin.length + 1 && lower.slice(1) === builtin.toLowerCase();
		return !prefixed && withinOneEdit(builtin, key);
	});
}

/** Whether one insertion, deletion, substitution or adjacent swap turns `a` into `b`. */
function withinOneEdit(a: string, b: string): boolean {
	if (a === b || Math.abs(a.length - b.length) > 1) return false;
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	const rest = (x: string, skip: number) => x.slice(i + skip);
	if (a.length === b.length) {
		const swapped = a[i] === b[i + 1] && a[i + 1] === b[i] && rest(a, 2) === rest(b, 2);
		return swapped || rest(a, 1) === rest(b, 1);
	}
	return a.length > b.length ? rest(a, 1) === rest(b, 0) : rest(a, 0) === rest(b, 1);
}
