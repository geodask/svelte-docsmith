/**
 * Filling the template's placeholders, run against a copy of the real
 * template: every placeholder is replaced, and a title with quotes still
 * leaves vite.config.ts valid.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyOptions, jsString } from '../apply-options.js';

const templateDir = fileURLToPath(new URL('../template', import.meta.url));
let dest;
afterEach(() => fs.rmSync(dest, { recursive: true, force: true }));

function scaffold(options) {
	dest = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-apply-'));
	fs.cpSync(templateDir, dest, { recursive: true });
	applyOptions(dest, { pkgName: 'my-docs', preset: 'default', ...options });
	return (rel) => fs.readFileSync(path.join(dest, rel), 'utf-8');
}

/** The value of the `const title = …;` line, evaluated as JavaScript. */
const titleIn = (config) => new Function(`return ${config.match(/^const title = (.*);$/m)[1]}`)();

test('replaces every placeholder in the template', () => {
	scaffold({ title: 'My Docs' });
	const leftover = fs
		.readdirSync(dest, { recursive: true })
		.filter((rel) => !fs.statSync(path.join(dest, rel)).isDirectory())
		.filter((rel) => /\{\{\s*[A-Z_]+\s*\}\}/.test(fs.readFileSync(path.join(dest, rel), 'utf-8')));
	assert.deepEqual(leftover, []);
});

test('writes the title once, into vite.config.ts', () => {
	const read = scaffold({ title: 'My Docs' });
	assert.equal(titleIn(read('vite.config.ts')), 'My Docs');
	assert.match(read('src/routes/+page.svelte'), /title=\{site\.title\}/);
});

test('keeps vite.config.ts valid for a title with quotes and backslashes', () => {
	const title = "Bob's \\ `Docs` ${x} $& $$ $`";
	const read = scaffold({ title });
	assert.equal(titleIn(read('vite.config.ts')), title);
	assert.equal(read('README.md').split('\n')[0], `# ${title}`);
});

test('jsString folds line breaks into a space', () => {
	for (const text of ['a\nb', 'a\r\nb', 'a\rb']) {
		assert.equal(new Function(`return ${jsString(text)}`)(), 'a b');
	}
});

test('sets a chosen preset as the theme in vite.config.ts, leaving app.css alone', () => {
	const pristine = fs.readFileSync(path.join(templateDir, 'src/app.css'), 'utf-8');
	const read = scaffold({ title: 'T', preset: 'ocean' });
	assert.match(read('vite.config.ts'), /^\t+theme: 'ocean',$/m);
	assert.doesNotMatch(read('vite.config.ts'), /\/\/ theme:/);
	assert.equal(read('src/app.css'), pristine);
});

test('names no theme for the default preset', () => {
	const read = scaffold({ title: 'T', preset: 'default' });
	assert.doesNotMatch(read('vite.config.ts'), /^\s*theme:/m);
});
