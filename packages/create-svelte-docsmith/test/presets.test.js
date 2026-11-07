/**
 * The theme prompt reads presets.json, a copy of the library's preset manifest
 * (the published CLI can't read the library's CSS when it runs). These tests
 * keep that copy, and the list in the template's app.css, in step with the CSS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import {
	readPresets,
	scaffolderManifest,
	scaffolderManifestPath
} from '../../svelte-docsmith/scripts/theme-presets.mjs';

const presets = readPresets();

test('presets.json matches the preset CSS', () => {
	assert.equal(
		fs.readFileSync(scaffolderManifestPath, 'utf8'),
		scaffolderManifest(presets),
		'presets.json is out of date: run node packages/svelte-docsmith/scripts/theme-presets.mjs'
	);
});

test("the template's app.css lists every preset to import, in order", () => {
	const css = fs.readFileSync(new URL('../template/src/app.css', import.meta.url), 'utf8');
	const list = css.match(/Available:([^.]*)\./)?.[1] ?? '';
	const listed = list.split(/[\s,*]+/).filter(Boolean);
	const importable = presets.filter((preset) => !preset.default).map((preset) => preset.slug);

	assert.deepEqual(listed, importable);
});
