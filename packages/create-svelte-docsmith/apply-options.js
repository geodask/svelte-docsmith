import fs from 'node:fs';
import path from 'node:path';

/**
 * `text` as a single-quoted JavaScript string, so a title like `Bob's Docs`
 * lands in the template's `vite.config.ts` as valid code. Line breaks fold
 * into a space: a title is one line.
 */
export function jsString(text) {
	return `'${text.replace(/[\\']/g, '\\$&').replace(/[\r\n]+/g, ' ')}'`;
}

/**
 * Fill the template placeholders in a freshly copied template at `dest`, and
 * wire the chosen theme preset into app.css. The site title goes into
 * `vite.config.ts` once; the landing page and footer read it from there.
 */
export function applyOptions(dest, { pkgName, title, preset }) {
	const edit = (rel, fn) => {
		const file = path.join(dest, rel);
		fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf-8')));
	};
	// Function replacers, so a `$&` or `$$` in the title is taken literally.
	edit('package.json', (t) => t.replaceAll('{{PROJECT_NAME}}', () => pkgName));
	edit('README.md', (t) => t.replaceAll('{{PROJECT_NAME}}', () => title));
	edit('vite.config.ts', (t) => t.replaceAll("'{{SITE_TITLE}}'", () => jsString(title)));
	if (preset && preset !== 'default') {
		edit('src/app.css', (t) =>
			t.replace(
				"@import 'svelte-docsmith/theme.css';\n",
				`@import 'svelte-docsmith/theme.css';\n@import 'svelte-docsmith/themes/${preset}.css';\n`
			)
		);
	}
}
