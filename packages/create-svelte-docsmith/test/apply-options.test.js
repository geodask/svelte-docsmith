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

test('imports a chosen preset after theme.css', () => {
	const read = scaffold({ title: 'T', preset: 'ocean' });
	assert.match(
		read('src/app.css'),
		/@import 'svelte-docsmith\/theme\.css';\n@import 'svelte-docsmith\/themes\/ocean\.css';\n/
	);
});
