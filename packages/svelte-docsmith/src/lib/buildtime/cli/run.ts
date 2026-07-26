/**
 * The `svelte-docsmith` maintenance CLI. Currently one command:
 * `archive-version`.
 *
 * This is the whole command, not a helper for it: `bin/svelte-docsmith.mjs` is a
 * shim that hands over `process.argv` and turns a thrown {@link CliError} into a
 * message and an exit code. Keeping the process boundary out here means the
 * command is typechecked, and testable in-process against a temporary directory
 * rather than by spawning node and parsing stdout.
 */
import { archiveVersion, type ArchiveVersionOptions } from './archive-version.js';
import { CliError } from './error.js';

export { CliError } from './error.js';
export { archiveVersion } from './archive-version.js';

export const HELP = `svelte-docsmith — docs maintenance CLI

Usage:
  svelte-docsmith archive-version <id> [options]

Freeze the current docs into an archived version folder. The archive keeps
serving the release it documents while you go on editing the docs root.

Options:
  --label <label>  switcher label for the archive (default: the id)
  --content <dir>  docs content directory (default: src/routes/docs)
  --routes <dir>   SvelteKit routes directory (default: src/routes)
`;

/** Where the command writes, and what it resolves relative paths against. */
export type CliIo = {
	cwd?: string;
	log?: (line: string) => void;
};

/** Parse `archive-version`'s flags and its one positional id. */
function parseArchiveArgs(rest: string[]): Omit<ArchiveVersionOptions, 'cwd'> {
	const options: Partial<ArchiveVersionOptions> = {};
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === '--label') options.label = rest[++i];
		else if (arg === '--content') options.content = rest[++i];
		else if (arg === '--routes') options.routes = rest[++i];
		else if (!arg.startsWith('--') && !options.id) options.id = arg;
	}
	if (!options.id) {
		throw new CliError('missing <id>. e.g. `svelte-docsmith archive-version v1`');
	}
	return options as Omit<ArchiveVersionOptions, 'cwd'>;
}

/**
 * Run the CLI over `argv` (everything after the node binary and script). Throws
 * {@link CliError} for anything the user can fix; the caller owns the exit code.
 */
export function run(argv: string[], io: CliIo = {}): void {
	const log = io.log ?? ((line: string) => console.log(line));
	const [command, ...rest] = argv;

	if (!command) {
		log(HELP);
		return;
	}
	if (command !== 'archive-version') {
		throw new CliError(`unknown command: ${command}\n\n${HELP}`);
	}

	archiveVersion({ ...parseArchiveArgs(rest), cwd: io.cwd }, log);
}
