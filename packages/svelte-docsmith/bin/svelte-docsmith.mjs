#!/usr/bin/env node
// Process boundary only. The command itself lives in
// `src/lib/buildtime/cli/`, where it is typechecked and unit-tested; this file
// exists so `svelte-docsmith` is a runnable bin entry.
import { run, CliError } from '../dist/buildtime/cli/run.js';

try {
	run(process.argv.slice(2));
} catch (error) {
	if (error instanceof CliError) {
		// A mistake the user can fix. The message says how; a stack would not help.
		console.error(`svelte-docsmith: ${error.message}`);
		process.exit(1);
	}
	throw error;
}
