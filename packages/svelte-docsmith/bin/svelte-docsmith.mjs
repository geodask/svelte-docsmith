#!/usr/bin/env node
// The svelte-docsmith maintenance CLI. Currently one command: `archive-version`,
// which freezes today's docs into an archived version folder so they stay live
// after a breaking release. Plain Node, no dependencies.
//
// The current version is served unprefixed from the docs root and is the folder
// you keep editing; archives are copies under their own prefix. See
// docs/adr/0001-unprefixed-current-docs.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
const existingArchives = new Set(
	fs
		.readdirSync(contentDir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && fs.existsSync(path.join(contentDir, e.name, MARKER)))
		.map((e) => e.name)
);

const isPage = (name) => name.endsWith('+page.md') || name.endsWith('+page.svx');

/**
 * Route files at the docs root that the archive already inherits, because it is
 * nested inside that root. Copying the root layout would wrap the archive in a
 * second `DocsShell`. Layouts deeper in the tree are copied, since the archive's
 * own copies of those pages need them.
 */
const isInheritedRouteFile = (name) => /^\+(layout|error)\./.test(name);

/** Copy the docs root into the archive, skipping directories that are archives. */
function copyCurrent(from, to) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const src = path.join(from, entry.name);
		const dest = path.join(to, entry.name);
		if (entry.isDirectory()) {
			// Never descend into the archive being written (it lives inside the docs
			// root) or into an archive written by an earlier run.
			if (src === toDir) continue;
			if (from === contentDir && existingArchives.has(entry.name)) continue;
			copyCurrent(src, dest);
		} else {
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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Point a copied page's docs links at this archive. Absolute links like
 * `](/docs/theming)` resolve to the *current* docs forever, so a verbatim copy
 * would silently walk readers out of the archive and into newer content. Links
 * that already target another archive are left alone.
 */
function rewriteLinks(text) {
	const pattern = new RegExp(`(\\]\\(|href=")(${escapeRe(docsBase)})([^)"\\s]*)`, 'g');
	return text.replace(pattern, (match, prefix, base, restRaw) => {
		const restPath = restRaw ?? '';
		// Guard the segment boundary: `/docsmith` must not become `/docs/v1mith`.
		if (restPath && !/^[/#?]/.test(restPath)) return match;
		const firstSegment = restPath.startsWith('/') ? restPath.slice(1).split(/[/#?]/)[0] : '';
		if (firstSegment && existingArchives.has(firstSegment)) return match;
		return `${prefix}${base}/${id}${restPath}`;
	});
}

/** Apply `transform` to the prose of a markdown source, leaving fenced code untouched. */
function outsideCodeFences(text, transform) {
	return text
		.split(/(^```[\s\S]*?^```)/m)
		.map((chunk) => (chunk.startsWith('```') ? chunk : transform(chunk)))
		.join('');
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

/**
 * Write the page's real last-updated date into its frontmatter. The collector
 * prefers frontmatter over git, so the archive keeps the date it was accurate
 * on instead of the day it was created.
 */
function freezeDate(text, date) {
	if (!date || !text.startsWith('---')) return text;
	const end = text.indexOf('\n---', 3);
	if (end === -1) return text;
	const front = text.slice(0, end);
	if (/^lastUpdated:/m.test(front)) return text;
	return `${front}\nlastUpdated: '${date}'${text.slice(end)}`;
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
	let text = fs.readFileSync(file, 'utf-8');
	text = outsideCodeFences(text, rewriteLinks);
	text = freezeDate(text, lastCommitDate(source));
	fs.writeFileSync(file, text);
}

const label = opts.label ?? id;
console.log(`\n✓ Archived the current docs into ${rel(toDir)} (${pages} pages)\n`);
console.log('Links were rewritten to stay inside the archive, and each page kept');
console.log('its real last-updated date. Review the diff, then update');
console.log('docsmith({ versions }) so the archive is served:\n');
console.log('  versions: {');
console.log("    current: { id: '<new release>', label: '<new release>' },");
console.log(
	`    archived: [{ id: '${id}', label: '${label}' }${existingArchives.size ? ', …' : ''}]`
);
console.log('  }\n');
