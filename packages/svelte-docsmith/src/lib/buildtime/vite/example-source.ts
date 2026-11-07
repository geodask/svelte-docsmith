/**
 * An example file's source, read once for both places it shows: the `?source`
 * transform highlights it for `LiveExample`, and agent markdown writes it out
 * as a fenced block. One reader, so the two can't trim it differently.
 */
import fs from 'node:fs';

/** The file as written, trailing whitespace trimmed; `undefined` when it can't be read. */
export function readExampleSource(file: string): string | undefined {
	try {
		return fs.readFileSync(file, 'utf-8').trimEnd();
	} catch {
		return undefined;
	}
}
