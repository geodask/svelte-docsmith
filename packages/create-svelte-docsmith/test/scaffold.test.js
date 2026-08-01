/**
 * Integration test: the starter template scaffolds and builds against the
 * workspace library (not the published pin). See issue #42.
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

describe('create-svelte-docsmith scaffold', () => {
	test(
		'scaffolds a project that builds against the workspace library',
		{ timeout: 300_000 },
		() => {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-svelte-docsmith-'));
			try {
				const dest = path.join(tmp, 'my-docs');

				// Non-interactive: no TTY → CLI uses defaults and skips install/git.
				const scaffold = run(process.execPath, [cliEntry, dest], {
					cwd: tmp,
					timeout: 30_000
				});
				assertOk(scaffold, 'scaffold');
				assert.ok(fs.existsSync(path.join(dest, 'package.json')), 'scaffold wrote package.json');

				// Resolve svelte-docsmith to the workspace package, not the pin.
				const pkgPath = path.join(dest, 'package.json');
				const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
				assert.ok(
					pkg.dependencies?.['svelte-docsmith'],
					'template must declare a svelte-docsmith dependency'
				);
				pkg.dependencies['svelte-docsmith'] = `file:${libRoot}`;
				fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, '\t')}\n`);

				const install = run('pnpm', ['install'], { cwd: dest });
				assertOk(install, 'pnpm install');

				// Confirm install used the workspace package (version + file protocol).
				const installedManifest = path.join(dest, 'node_modules/svelte-docsmith/package.json');
				assert.ok(fs.existsSync(installedManifest), 'svelte-docsmith was installed');
				const installed = JSON.parse(fs.readFileSync(installedManifest, 'utf8'));
				assert.equal(
					installed.version,
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

				const build = run('pnpm', ['run', 'build'], { cwd: dest });
				assertOk(build, 'pnpm run build');
			} finally {
				fs.rmSync(tmp, { recursive: true, force: true });
			}
		}
	);
});
