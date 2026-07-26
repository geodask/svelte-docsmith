#!/usr/bin/env node
// The svelte-docsmith maintenance CLI. Currently one command: `cut-version`,
// which snapshots the working "next" docs into a frozen version folder. Plain
// Node, no dependencies.
import fs from 'node:fs';
import path from 'node:path';

const HELP = `svelte-docsmith — docs maintenance CLI

Usage:
  svelte-docsmith cut-version <id> [options]

Snapshot the current "next" docs into a frozen version folder, so you can keep
editing "next" while readers get the released version.

Options:
  --from <dir>     version folder to snapshot from (default: next)
  --label <label>  switcher label for the new version (default: the id)
  --content <dir>  docs content directory (default: src/routes/docs)
`;

const [command, ...rest] = process.argv.slice(2);

if (command !== 'cut-version') {
	console.log(HELP);
	process.exit(command ? 1 : 0);
}

const opts = { from: 'next', content: 'src/routes/docs', label: undefined };
let id;
for (let i = 0; i < rest.length; i++) {
	const arg = rest[i];
	if (arg === '--from') opts.from = rest[++i];
	else if (arg === '--label') opts.label = rest[++i];
	else if (arg === '--content') opts.content = rest[++i];
	else if (!arg.startsWith('--') && !id) id = arg;
}

const fail = (message) => {
	console.error(`svelte-docsmith cut-version: ${message}`);
	process.exit(1);
};

if (!id) fail('missing <id>. e.g. `svelte-docsmith cut-version v2`');

const contentDir = path.resolve(opts.content);
const fromDir = path.join(contentDir, opts.from);
const toDir = path.join(contentDir, id);
const rel = (p) => path.relative(process.cwd(), p);

if (!fs.existsSync(fromDir)) fail(`source folder not found: ${rel(fromDir)}`);
if (fs.existsSync(toDir)) fail(`target already exists: ${rel(toDir)}`);

function countPages(dir) {
	let n = 0;
	for (const entry of fs.readdirSync(dir, { recursive: true })) {
		const name = typeof entry === 'string' ? entry : String(entry);
		if (name.endsWith('+page.md') || name.endsWith('+page.svx')) n++;
	}
	return n;
}

fs.cpSync(fromDir, toDir, { recursive: true });

const label = opts.label ?? id;
console.log(`\n✓ Snapshotted ${opts.from}/ → ${id}/ (${countPages(toDir)} pages)\n`);
console.log('Now update docsmith({ versions }) so the snapshot becomes the latest release:\n');
console.log(`  { id: '${id}', label: '${label}', path: '${id}', latest: true },`);
console.log(`  // …and remove \`latest: true\` from the version it replaces.\n`);
