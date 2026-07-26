#!/usr/bin/env node
// The svelte-docsmith maintenance CLI. Currently one command: `archive-version`,
// which freezes today's docs into an archived version folder so they stay live
// after a breaking release.
//
// The current version is served unprefixed from the docs root and is the folder
// you keep editing; archives are copies under their own prefix. See
// docs/adr/0001-unprefixed-current-docs.md. The text transforms live in
// `src/lib/buildtime/archive.ts` so they are typechecked and unit-tested; this
// file is the filesystem wrapper around them.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
	rewriteDocsLinks,
	freezeLastUpdated,
	isInheritedRouteFile
} from '../dist/buildtime/archive.js';

const HELP = `svelte-docsmith — docs maintenance CLI

Usage:
  svelte-docsmith archive-version <id> [options]

Freeze the current docs into an archived version folder. The archive keeps
serving the release it documents while you go on editing the docs root.

Options:
  --label <label>  switcher label for the archive (default: the id)
  --content <dir>  docs content directory (default: src/routes/docs)
  --routes <dir>   SvelteKit routes directory (default: src/routes)
`;

// Written into every archive this command creates, so later runs know which
// directories are already archives and must not be copied into the new one.
const MARKER = '.docsmith-archive';

const [command, ...rest] = process.argv.slice(2);

if (command !== 'archive-version') {
	console.log(HELP);
	process.exit(command ? 1 : 0);
}

const opts = { content: 'src/routes/docs', routes: 'src/routes', label: undefined };
let id;
for (let i = 0; i < rest.length; i++) {
	const arg = rest[i];
	if (arg === '--label') opts.label = rest[++i];
	else if (arg === '--content') opts.content = rest[++i];
	else if (arg === '--routes') opts.routes = rest[++i];
	else if (!arg.startsWith('--') && !id) id = arg;
}

const fail = (message) => {
	console.error(`svelte-docsmith archive-version: ${message}`);
	process.exit(1);
};

if (!id) fail('missing <id>. e.g. `svelte-docsmith archive-version v1`');
if (!/^[A-Za-z0-9._-]+$/.test(id)) fail(`invalid id: ${id}. It is used as a URL segment.`);

const contentDir = path.resolve(opts.content);
const routesDir = path.resolve(opts.routes);
const toDir = path.join(contentDir, id);
const rel = (p) => path.relative(process.cwd(), p);

if (!fs.existsSync(contentDir)) fail(`content directory not found: ${rel(contentDir)}`);
if (fs.existsSync(toDir)) fail(`target already exists: ${rel(toDir)}`);

// The docs URL base (e.g. `/docs`), derived exactly as the vite plugin does.
const docsBase = '/' + path.relative(routesDir, contentDir).split(path.sep).join('/');

/** Directories directly under the docs root that are already archives. */
const archivedIds = new Set(
	fs
		.readdirSync(contentDir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && fs.existsSync(path.join(contentDir, e.name, MARKER)))
		.map((e) => e.name)
);

const isPage = (name) => name.endsWith('+page.md') || name.endsWith('+page.svx');

/** Copy the docs root into the archive, skipping what the archive shouldn't hold. */
function copyCurrent(from, to) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const src = path.join(from, entry.name);
		const dest = path.join(to, entry.name);
		if (entry.isDirectory()) {
			// Never descend into the archive being written (it lives inside the docs
			// root) or into an archive written by an earlier run.
			if (src === toDir) continue;
			if (from === contentDir && archivedIds.has(entry.name)) continue;
			copyCurrent(src, dest);
		} else {
			// The root layout and error page already apply to the archive, which is
			// nested inside them; copying them would nest a second DocsShell.
			if (from === contentDir && isInheritedRouteFile(entry.name)) continue;
			fs.copyFileSync(src, dest);
		}
	}
}

/** Every file in the archive, paired with the source file it was copied from. */
function* eachCopiedFile(dir = toDir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* eachCopiedFile(file);
		else yield { file, source: path.join(contentDir, path.relative(toDir, file)) };
	}
}

/** The date a page last really changed, so the archive doesn't claim today. */
function lastCommitDate(file) {
	try {
		const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
			cwd: path.dirname(file),
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
		return out || undefined;
	} catch {
		return undefined;
	}
}

copyCurrent(contentDir, toDir);
fs.writeFileSync(
	path.join(toDir, MARKER),
	`Archived docs for ${id}, created by \`svelte-docsmith archive-version\`.\n` +
		`This folder is frozen: edit the docs root instead.\n`
);

let pages = 0;
for (const { file, source } of eachCopiedFile()) {
	if (!isPage(path.basename(file))) continue;
	pages++;
	const text = fs.readFileSync(file, 'utf-8');
	fs.writeFileSync(
		file,
		freezeLastUpdated(
			rewriteDocsLinks(text, { docsBase, versionId: id, archivedIds }),
			lastCommitDate(source)
		)
	);
}

const label = opts.label ?? id;
console.log(`\n✓ Archived the current docs into ${rel(toDir)} (${pages} pages)\n`);
console.log('Links were rewritten to stay inside the archive, and each page kept');
console.log('its real last-updated date. Review the diff, then update');
console.log('docsmith({ versions }) so the archive is served:\n');
console.log('  versions: {');
console.log("    current: { id: '<new release>', label: '<new release>' },");
console.log(`    archived: [{ id: '${id}', label: '${label}' }${archivedIds.size ? ', …' : ''}]`);
console.log('  }\n');
