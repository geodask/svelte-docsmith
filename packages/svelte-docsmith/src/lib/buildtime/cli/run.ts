/**
 * The `svelte-docsmith` maintenance CLI. Currently one command:
 * `archive-version`.
 *
 * This is the whole command, not a helper for it: `bin/svelte-docsmith.mjs` is a
 * shim that hands over `process.argv` and turns a thrown {@link CliError} into a
 * message and an exit code. Keeping the process boundary out here means the
 * command is typechecked, and testable in-process against a temporary directory
 * rather than by spawning node and parsing stdout.
 *
 * @experimental `archive-version` sits outside the 1.0 stability promise and
 * may change in a minor until authors have used versioning for real.
 */
import { archiveVersion } from './archive-version.js';
import { CliError } from './error.js';
import { loadDocsmithOptions } from './load-options.js';

export { CliError } from './error.js';
export { archiveVersion } from './archive-version.js';

export const HELP = `svelte-docsmith — docs maintenance CLI

Usage:
  svelte-docsmith archive-version <id> [options]

Freeze the current docs into an archived version folder. The archive keeps
serving the release it documents while you go on editing the docs root.

Reads the docs directory, routes directory and versions from the docsmith()
options in your vite.config, so run it from your docs app.

Options:
  --label <label>  switcher label for the archive (default: the current
                   version's label when <id> is the current version, else <id>)
  --config <file>  vite config to read (default: the one Vite finds here)
`;

/** Where the command writes, and what it resolves relative paths against. */
export type CliIo = {
	cwd?: string;
	log?: (line: string) => void;
};

type ArchiveArgs = { id: string; label?: string; config?: string };

/** Flags that set where the docs are. They live in `docsmith()` now. */
const MOVED_FLAGS = ['--content', '--routes'];

/** Parse `archive-version`'s flags and its one positional id. */
function parseArchiveArgs(rest: string[]): ArchiveArgs {
	const args: Partial<ArchiveArgs> = {};
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === '--label') args.label = rest[++i];
		else if (arg === '--config') args.config = rest[++i];
		else if (MOVED_FLAGS.includes(arg)) {
			throw new CliError(
				`${arg} is gone: the command reads \`content\` and \`routes\` from your docsmith() options. ` +
					'Pass --config <file> if your vite config is somewhere else.'
			);
		} else if (!arg.startsWith('--') && !args.id) args.id = arg;
	}
	if (!args.id) {
		throw new CliError('missing <id>. e.g. `svelte-docsmith archive-version v1`');
	}
	return args as ArchiveArgs;
}

/**
 * Run the CLI over `argv` (everything after the node binary and script). Throws
 * {@link CliError} for anything the user can fix; the caller owns the exit code.
 */
export async function run(argv: string[], io: CliIo = {}): Promise<void> {
	const log = io.log ?? ((line: string) => console.log(line));
	const [command, ...rest] = argv;

	if (!command) {
		log(HELP);
		return;
	}
	if (command !== 'archive-version') {
		throw new CliError(`unknown command: ${command}\n\n${HELP}`);
	}

	const cwd = io.cwd ?? process.cwd();
	const { id, label, config } = parseArchiveArgs(rest);
	const { contentDir, routesDir, versions } = await loadDocsmithOptions(cwd, config);
	archiveVersion({ id, label, contentDir, routesDir, versions, cwd }, log);
}
