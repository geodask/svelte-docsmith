/**
 * A failure the user caused and can fix: a missing argument, a bad id, a target
 * that already exists. The `bin/` shim prints its message and exits 1, without
 * a stack, because a stack is noise for these. Anything else thrown out of the
 * command is a bug and keeps its stack.
 */
export class CliError extends Error {
	readonly name = 'CliError';
}
