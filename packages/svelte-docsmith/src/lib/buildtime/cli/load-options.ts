/**
 * Read a site's `docsmith()` options for the CLI, from the site's own
 * `vite.config`, so the content and routes directories and the declared
 * versions are never given to the CLI a second time.
 *
 * The config is loaded with Vite's own loader, which bundles and evaluates it
 * the way `vite build` does, and the options are taken from the docsmith
 * content plugin, which carries them for exactly this.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { PluginOption } from 'vite';
import {
	resolveOptions,
	type DocsmithOptions,
	type ResolvedDocsmithOptions
} from '../vite/options.js';
import { CliError } from './error.js';

/** Flatten Vite's nested, possibly-async plugin list. */
async function flatten(option: PluginOption): Promise<unknown[]> {
	const value = await option;
	if (Array.isArray(value)) return (await Promise.all(value.map(flatten))).flat();
	return value ? [value] : [];
}

/**
 * Load `configFile` (or the `vite.config.*` Vite finds in `cwd`) and resolve
 * its `docsmith()` options against `cwd`. Throws {@link CliError} when there
 * is no config, or no docsmith plugin in it.
 */
export async function loadDocsmithOptions(
	cwd: string,
	configFile?: string
): Promise<ResolvedDocsmithOptions> {
	const { loadConfigFromFile } = await import('vite');
	const file = configFile && path.resolve(cwd, configFile);
	if (file && !fs.existsSync(file)) throw new CliError(`config not found: ${configFile}`);
	const loaded = await loadConfigFromFile(
		{ command: 'build', mode: 'production' },
		file,
		cwd,
		'silent'
	).catch((error: Error) => {
		throw new CliError(`could not load ${configFile ?? 'vite.config'}: ${error.message}`);
	});
	if (!loaded) {
		throw new CliError(
			'no vite.config found here. Run this from your docs app, or pass --config <file>.'
		);
	}

	const plugins = await flatten(loaded.config.plugins ?? []);
	const options = plugins
		.map((plugin) => (plugin as { api?: { docsmith?: DocsmithOptions } }).api?.docsmith)
		.find(Boolean);
	if (!options) {
		throw new CliError(
			`${path.relative(cwd, loaded.path) || loaded.path} has no docsmith() plugin to read the docs from.`
		);
	}
	return resolveOptions(options, cwd);
}
