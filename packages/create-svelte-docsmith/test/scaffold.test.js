/**
 * Integration test: the starter template scaffolds and builds against the
 * workspace library (not the published pin). See issue #42.
 *
 * The template targets SvelteKit 3, but the library also supports SvelteKit 2,
 * so a second case rewrites the scaffold into a Kit 2 app and builds that too.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, '..');
const libRoot = path.resolve(cliRoot, '../svelte-docsmith');
const cliEntry = path.join(cliRoot, 'index.js');
const libManifest = JSON.parse(fs.readFileSync(path.join(libRoot, 'package.json'), 'utf8'));

/** Run a command; return the completed process for assertions. */
function run(cmd, args, opts = {}) {
	return spawnSync(cmd, args, {
		encoding: 'utf8',
		// Builds pull a full SvelteKit toolchain; give them room.
		timeout: opts.timeout ?? 180_000,
		...opts
	});
}

function assertOk(result, label) {
	const detail = [result.stdout, result.stderr].filter(Boolean).join('\n');
	assert.equal(result.status, 0, `${label} failed (status ${result.status}):\n${detail}`);
	assert.equal(result.error, undefined, `${label} spawn error: ${result.error}`);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, '\t')}\n`);

/** Scaffold into a fresh temp dir and point svelte-docsmith at the workspace. */
function scaffold(tmp) {
	const dest = path.join(tmp, 'my-docs');

	// Non-interactive: no TTY → CLI uses defaults and skips install/git.
	const result = run(process.execPath, [cliEntry, dest], { cwd: tmp, timeout: 30_000 });
	assertOk(result, 'scaffold');
	assert.ok(fs.existsSync(path.join(dest, 'package.json')), 'scaffold wrote package.json');

	// Resolve svelte-docsmith to the workspace package, not the pin.
	const pkgPath = path.join(dest, 'package.json');
	const pkg = readJson(pkgPath);
	assert.ok(pkg.dependencies?.['svelte-docsmith'], 'template must declare a svelte-docsmith dependency');
	pkg.dependencies['svelte-docsmith'] = `file:${libRoot}`;
	writeJson(pkgPath, pkg);

	return dest;
}

/** Install, confirm the workspace library was linked, then build. */
function installAndBuild(dest) {
	assertOk(run('pnpm', ['install'], { cwd: dest }), 'pnpm install');

	// Confirm install used the workspace package (version + file protocol).
	const installedManifest = path.join(dest, 'node_modules/svelte-docsmith/package.json');
	assert.ok(fs.existsSync(installedManifest), 'svelte-docsmith was installed');
	assert.equal(
		readJson(installedManifest).version,
		libManifest.version,
		'installed svelte-docsmith must match the workspace library version'
	);
	// pnpm records file: deps as `svelte-docsmith@file:...` — that is the
	// signal we linked the workspace package rather than a registry pin.
	const lock = fs.readFileSync(path.join(dest, 'pnpm-lock.yaml'), 'utf8');
	assert.match(
		lock,
		/svelte-docsmith@file:/,
		'lockfile must resolve svelte-docsmith via file: (workspace), not the registry'
	);

	assertOk(run('pnpm', ['run', 'build'], { cwd: dest }), 'pnpm run build');
}

/**
 * Turn the SvelteKit 3 scaffold into the equivalent SvelteKit 2 app: config
 * back in svelte.config.js, the generated tsconfig, and `$lib` imports.
 */
function downgradeToKit2(dest) {
	fs.writeFileSync(
		path.join(dest, 'svelte.config.js'),
		`import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith } from 'svelte-docsmith/preprocess';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), docsmith()],
	kit: { adapter: adapter() }
};
`
	);
	fs.writeFileSync(
		path.join(dest, 'vite.config.ts'),
		`import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [docsmith(), tailwindcss(), sveltekit()]
});
`
	);
	writeJson(path.join(dest, 'tsconfig.json'), {
		extends: './.svelte-kit/tsconfig.json',
		compilerOptions: { strict: true, moduleResolution: 'bundler' }
	});

	const pkgPath = path.join(dest, 'package.json');
	const pkg = readJson(pkgPath);
	delete pkg.imports;
	pkg.devDependencies['@sveltejs/kit'] = '^2.16.0';
	pkg.devDependencies['@sveltejs/adapter-auto'] = '^7.0.0';
	writeJson(pkgPath, pkg);

	for (const file of fs.readdirSync(path.join(dest, 'src'), { recursive: true })) {
		const full = path.join(dest, 'src', file);
		if (!/\.(svelte|ts|md)$/.test(full) || !fs.statSync(full).isFile()) continue;
		const source = fs.readFileSync(full, 'utf8');
		const kit2 = source.replace(/'#lib\/([^']+)\.ts'/g, "'$$lib/$1'");
		if (kit2 !== source) fs.writeFileSync(full, kit2);
	}
}

describe('create-svelte-docsmith scaffold', () => {
	test(
		'scaffolds a SvelteKit 3 project that builds against the workspace library',
		{ timeout: 300_000 },
		() => {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-svelte-docsmith-'));
			try {
				installAndBuild(scaffold(tmp));
			} finally {
				fs.rmSync(tmp, { recursive: true, force: true });
			}
		}
	);

	test(
		'the same project builds on SvelteKit 2 against the workspace library',
		{ timeout: 300_000 },
		() => {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-svelte-docsmith-kit2-'));
			try {
				const dest = scaffold(tmp);
				downgradeToKit2(dest);
				installAndBuild(dest);

				const kit = readJson(path.join(dest, 'node_modules/@sveltejs/kit/package.json'));
				assert.equal(kit.version.split('.')[0], '2', 'the Kit 2 case must install SvelteKit 2');
			} finally {
				fs.rmSync(tmp, { recursive: true, force: true });
			}
		}
	);
});
