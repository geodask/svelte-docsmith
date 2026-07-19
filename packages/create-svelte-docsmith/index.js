#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';

const templateDir = fileURLToPath(new URL('./template', import.meta.url));

const PRESETS = [
	{ value: 'default', label: 'Default (Darkmatter)' },
	{ value: 'tangerine', label: 'Tangerine' },
	{ value: 'amethyst', label: 'Amethyst' },
	{ value: 'graphite', label: 'Graphite' },
	{ value: 'evergreen', label: 'Evergreen' },
	{ value: 'rose', label: 'Rose' },
	{ value: 'ocean', label: 'Ocean' },
	{ value: 'nord', label: 'Nord' },
	{ value: 'claude', label: 'Claude' },
	{ value: 'bubblegum', label: 'Bubblegum' },
	{ value: 'mono', label: 'Mono' }
];

/** Copy `src` into `dest`, renaming the packaged `_gitignore` back to `.gitignore`. */
function copyTemplate(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const from = path.join(src, entry.name);
		const name = entry.name === '_gitignore' ? '.gitignore' : entry.name;
		const to = path.join(dest, name);
		if (entry.isDirectory()) copyTemplate(from, to);
		else fs.copyFileSync(from, to);
	}
}

/** Detect the package manager that invoked us (npm/pnpm/yarn/bun). */
function detectPackageManager() {
	const ua = process.env.npm_config_user_agent ?? '';
	if (ua.startsWith('pnpm')) return 'pnpm';
	if (ua.startsWith('yarn')) return 'yarn';
	if (ua.startsWith('bun')) return 'bun';
	return 'npm';
}

function toPackageName(dir) {
	return (
		path
			.basename(path.resolve(dir))
			.toLowerCase()
			.replace(/[^a-z0-9-~]/g, '-')
			.replace(/^-+|-+$/g, '') || 'my-docs'
	);
}

function toTitle(name) {
	return (
		name
			.split(/[-_\s]+/)
			.filter(Boolean)
			.map((w) => w[0].toUpperCase() + w.slice(1))
			.join(' ') || 'My Docs'
	);
}

/** Fill the template placeholders, and wire the chosen theme preset into app.css. */
function applyOptions(dest, { pkgName, title, preset }) {
	const edit = (rel, fn) => {
		const file = path.join(dest, rel);
		fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf-8')));
	};
	edit('package.json', (t) => t.replaceAll('{{PROJECT_NAME}}', pkgName));
	edit('README.md', (t) => t.replaceAll('{{PROJECT_NAME}}', title));
	edit('src/lib/site-config.ts', (t) => t.replaceAll('{{SITE_TITLE}}', title));
	edit('src/routes/+page.svelte', (t) => t.replaceAll('{{SITE_TITLE}}', title));
	if (preset && preset !== 'default') {
		edit('src/app.css', (t) =>
			t.replace(
				"@import 'svelte-docsmith/theme.css';\n",
				`@import 'svelte-docsmith/theme.css';\n@import 'svelte-docsmith/themes/${preset}.css';\n`
			)
		);
	}
}

/** Run a command asynchronously so the event loop stays free (a synchronous
 *  child would freeze the spinner animation). Resolves with the exit code. */
function run(cmd, args, cwd) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, {
			cwd,
			stdio: 'ignore',
			shell: process.platform === 'win32'
		});
		child.on('close', (code) => resolve(code ?? 1));
		child.on('error', () => resolve(1));
	});
}

/** Exit gracefully when the user hits Ctrl+C at a prompt. */
function unlessCancelled(value) {
	if (p.isCancel(value)) {
		p.cancel('Cancelled.');
		process.exit(0);
	}
	return value;
}

async function main() {
	p.intro('create-svelte-docsmith');
	const interactive = Boolean(process.stdin.isTTY);
	const pm = detectPackageManager();

	// 1. Target directory (skip the prompt if passed as an argument).
	let target = process.argv[2];
	if (!target) {
		target = interactive
			? unlessCancelled(
					await p.text({
						message: 'Where should we create your docs?',
						placeholder: './my-docs',
						defaultValue: './my-docs'
					})
				)
			: './my-docs';
	}
	const dest = path.resolve(process.cwd(), target);
	const rel = path.relative(process.cwd(), dest) || '.';

	// 2. Refuse to clobber a non-empty directory (unless the user confirms).
	if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
		const overwrite = interactive
			? unlessCancelled(
					await p.confirm({
						message: `${rel} is not empty. Create the site here anyway?`,
						initialValue: false
					})
				)
			: false;
		if (!overwrite) {
			p.cancel(`${rel} is not empty. Aborting.`);
			process.exit(1);
		}
	}

	const defaultTitle = toTitle(toPackageName(dest));

	// 3. Site title.
	const title = interactive
		? unlessCancelled(
				await p.text({
					message: 'Site title',
					placeholder: defaultTitle,
					defaultValue: defaultTitle
				})
			) || defaultTitle
		: defaultTitle;

	// 4. Theme preset.
	const preset = interactive
		? unlessCancelled(
				await p.select({ message: 'Theme', options: PRESETS, initialValue: 'default' })
			)
		: 'default';

	// 5 & 6. Install dependencies / init git.
	const doInstall = interactive
		? unlessCancelled(
				await p.confirm({ message: `Install dependencies with ${pm}?`, initialValue: true })
			)
		: false;
	const doGit = interactive
		? unlessCancelled(
				await p.confirm({ message: 'Initialize a git repository?', initialValue: true })
			)
		: false;

	// Scaffold.
	copyTemplate(templateDir, dest);
	applyOptions(dest, { pkgName: toPackageName(dest), title, preset });

	if (doInstall) {
		const s = p.spinner();
		s.start(`Installing dependencies with ${pm} (this can take a minute)`);
		const code = await run(pm, ['install'], dest);
		if (code === 0) s.stop('Dependencies installed');
		else s.stop(`Could not install with ${pm}; run it yourself later`);
	}

	if (doGit) {
		// Fast and non-interactive, so a synchronous call is fine here.
		spawnSync('git', ['init', '-q'], { cwd: dest, stdio: 'ignore' });
	}

	// Next steps.
	const runCmd = pm === 'npm' ? 'npm run' : pm;
	const steps = [];
	if (rel !== '.') steps.push(`cd ${rel}`);
	if (!doInstall) steps.push(`${pm} install`);
	steps.push(`${runCmd} dev`);
	p.note(steps.join('\n'), 'Next steps');
	p.outro('Add markdown under src/routes/docs/ and it appears in the sidebar.');
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
