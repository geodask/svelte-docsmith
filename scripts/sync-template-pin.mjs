#!/usr/bin/env node
/**
 * Keeps the create-svelte-docsmith starter template's `svelte-docsmith` pin in
 * range with the library, so fresh scaffolds never install a stale release
 * (the pin went stale twice before this existed: see create-svelte-docsmith
 * 0.1.1 and 0.2.1).
 *
 * Modes:
 *   check  Fail if the template pin does not cover the library's current
 *          version. Runs in CI as a safety net.
 *   pre    Before `changeset version`: if the pending changesets will move
 *          the library out of the pin's range, queue a create-svelte-docsmith
 *          patch changeset so the CLI is versioned and published alongside.
 *   post   After `changeset version`: rewrite the pin to the library's new
 *          version when it fell out of range.
 *
 * `pre` and `post` run around `changeset version` via the root `ci:version`
 * script, which the release workflow passes to changesets/action.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const libManifest = path.join(root, 'packages/svelte-docsmith/package.json');
const templateManifest = path.join(root, 'packages/create-svelte-docsmith/template/package.json');
const changesetDir = path.join(root, '.changeset');
const syncChangeset = path.join(changesetDir, 'sync-template-pin.md');

const parse = (version) => version.split('.').map(Number);

const libVersion = () => JSON.parse(fs.readFileSync(libManifest, 'utf-8')).version;

function templatePin() {
	const pin = JSON.parse(fs.readFileSync(templateManifest, 'utf-8')).dependencies[
		'svelte-docsmith'
	];
	if (!/^\^\d+\.\d+\.\d+$/.test(pin)) {
		throw new Error(`Expected a caret pin like ^1.2.3 in the template, got "${pin}"`);
	}
	return pin;
}

/** `^a.b.c` caret-range check; the template pin is validated to that shape. */
function pinCovers(pin, version) {
	const base = parse(pin.slice(1));
	const v = parse(version);
	const cmp = v[0] - base[0] || v[1] - base[1] || v[2] - base[2];
	if (cmp < 0) return false;
	if (base[0] > 0) return v[0] === base[0];
	if (base[1] > 0) return v[0] === 0 && v[1] === base[1];
	return cmp === 0;
}

/** Highest bump for svelte-docsmith across the pending changesets, or null. */
function pendingLibBump() {
	const rank = { patch: 1, minor: 2, major: 3 };
	let highest = null;
	for (const entry of fs.readdirSync(changesetDir)) {
		if (!entry.endsWith('.md') || entry === 'README.md') continue;
		const frontmatter = fs.readFileSync(path.join(changesetDir, entry), 'utf-8').split('---')[1];
		const match = frontmatter?.match(/^['"]?svelte-docsmith['"]?\s*:\s*(major|minor|patch)\s*$/m);
		if (match && (!highest || rank[match[1]] > rank[highest])) highest = match[1];
	}
	return highest;
}

function bump(version, type) {
	const [major, minor, patch] = parse(version);
	if (type === 'major') return `${major + 1}.0.0`;
	if (type === 'minor') return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

function check() {
	const version = libVersion();
	const pin = templatePin();
	if (!pinCovers(pin, version)) {
		console.error(
			`The create-svelte-docsmith template pins svelte-docsmith@${pin}, which does not cover ` +
				`the library's current version ${version}, so fresh scaffolds would install a stale ` +
				`release. Bump the pin in packages/create-svelte-docsmith/template/package.json and ` +
				`add a create-svelte-docsmith patch changeset (releases do this automatically via ` +
				`\`pnpm ci:version\`).`
		);
		process.exit(1);
	}
	console.log(`Template pin ${pin} covers svelte-docsmith@${version}.`);
}

function pre() {
	const type = pendingLibBump();
	if (!type) return;
	const next = bump(libVersion(), type);
	if (pinCovers(templatePin(), next)) return;
	fs.writeFileSync(
		syncChangeset,
		`---\n'create-svelte-docsmith': patch\n---\n\n` +
			`Pin the starter template to \`svelte-docsmith@^${next}\` so freshly scaffolded ` +
			`projects install the current release.\n`
	);
	console.log(
		`svelte-docsmith is about to become ${next}; queued a create-svelte-docsmith patch ` +
			`changeset to re-pin the template.`
	);
}

function post() {
	const version = libVersion();
	const pin = templatePin();
	if (pinCovers(pin, version)) return;
	const needle = `"svelte-docsmith": "${pin}"`;
	const source = fs.readFileSync(templateManifest, 'utf-8');
	if (!source.includes(needle)) {
		throw new Error(`Could not find ${needle} in ${templateManifest}`);
	}
	fs.writeFileSync(templateManifest, source.replace(needle, `"svelte-docsmith": "^${version}"`));
	console.log(`Re-pinned the template to svelte-docsmith@^${version} (was ${pin}).`);
}

const mode = process.argv[2];
if (mode === 'check') check();
else if (mode === 'pre') pre();
else if (mode === 'post') post();
else {
	console.error('Usage: node scripts/sync-template-pin.mjs <check|pre|post>');
	process.exit(1);
}
