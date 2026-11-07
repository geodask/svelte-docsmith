import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { run, CliError } from './run.js';
import { decodePasteCode, startThemeServer, themeFileFromLink, writeTheme } from './theme.js';

/** The same link the docs site's builder tests decode (sites/docs core.test.ts). */
const LINK_FIXTURE =
	'dc3hCsIgGIXhW5Hzq0Dkc-AK78ambeI249sWxPDeQyKIYP8OPPCeHU9YLbHmFOYFdscY-2Gt4-a61HPeZg-LnMZuOGlBgs6QuGcOf0aq-eqD4-T49UPGiOpNa6qz83FbYEHKcJhQJLzjdHBKSl-PyxdBSrefcinlDQ';

const THEME =
	':root {\n\t--primary: oklch(0.55 0.2 265);\n}\n\n.dark {\n\t--background: oklch(0.18 0 0);\n}\n';

let dir: string | undefined;

afterEach(() => {
	if (dir) fs.rmSync(dir, { recursive: true, force: true });
	dir = undefined;
});

function scratch(config?: string): string {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-theme-'));
	if (config !== undefined) fs.writeFileSync(path.join(dir, 'vite.config.ts'), config);
	return dir;
}

const read = (file: string) => fs.readFileSync(path.join(dir!, file), 'utf8');

const config = (options: string) =>
	`import { sveltekit } from '@sveltejs/kit/vite';
import { docsmith } from 'svelte-docsmith/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		docsmith({${options}
			site: { title: 'Docs' }
		}),
		sveltekit()
	]
});
`;

const pasteCode = (file: string) => `dsm1.${zlib.deflateRawSync(file).toString('base64url')}`;

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();

/** Start the command the way the bin does, and hand back the builder URL it opens. */
function start(cwd: string, extra: string[] = [], input = new PassThrough(), timeoutMs?: number) {
	const lines: string[] = [];
	let opened!: (url: URL) => void;
	const url = new Promise<URL>((r) => (opened = r));
	const done = run(['theme', ...extra], {
		cwd,
		log: (line) => lines.push(line),
		input,
		openUrl: (u) => opened(new URL(u)),
		timeoutMs
	});
	return { lines, url, done, input };
}

describe('writeTheme', () => {
	it('adds theme as the first docsmith() option when there is none', () => {
		const cwd = scratch(config(''));
		const changes = writeTheme(THEME, { cwd });
		expect(read('src/theme.css')).toBe(THEME);
		expect(read('vite.config.ts')).toContain(
			"docsmith({\n\t\t\ttheme: './src/theme.css',\n\t\t\tsite:"
		);
		expect(changes).toEqual([
			'wrote src/theme.css',
			"set theme: './src/theme.css' in vite.config.ts"
		]);
	});

	it('replaces the commented-out theme line the scaffold leaves', () => {
		const cwd = scratch(config("\n\t\t\t// theme: 'ocean',"));
		writeTheme(THEME, { cwd });
		const code = read('vite.config.ts');
		expect(code).toContain("\n\t\t\ttheme: './src/theme.css',\n");
		expect(code).not.toContain('ocean');
	});

	it('replaces a preset', () => {
		const cwd = scratch(config('\n\t\t\ttheme: "rose",'));
		writeTheme(THEME, { cwd, file: 'styles/brand.css' });
		expect(read('styles/brand.css')).toBe(THEME);
		expect(read('vite.config.ts')).toContain("theme: './styles/brand.css',");
		expect(read('vite.config.ts')).not.toContain('rose');
	});

	it('leaves a theme option outside the docsmith() call alone', () => {
		const cwd = scratch(`const theme = 'x';\nconst other = { theme: 'keep' };\n` + config(''));
		writeTheme(THEME, { cwd });
		const code = read('vite.config.ts');
		expect(code).toContain("{ theme: 'keep' }");
		expect(code).toContain("docsmith({\n\t\t\ttheme: './src/theme.css',");
	});

	it('writes the file but says so when there is no docsmith() call', () => {
		const cwd = scratch('export default {};\n');
		expect(writeTheme(THEME, { cwd })).toEqual([
			'wrote src/theme.css',
			"found no docsmith({ … }) call in vite.config.ts: add theme: './src/theme.css' to it yourself"
		]);
		expect(read('src/theme.css')).toBe(THEME);
		expect(read('vite.config.ts')).toBe('export default {};\n');
	});

	it('writes the file but says so when there is no vite config', () => {
		const cwd = scratch();
		expect(writeTheme(THEME, { cwd })).toEqual([
			'wrote src/theme.css',
			"found no vite.config here: add theme: './src/theme.css' to docsmith() yourself"
		]);
		expect(read('src/theme.css')).toBe(THEME);
	});

	it('refuses something that is not a theme file', () => {
		const cwd = scratch(config(''));
		expect(() => writeTheme('hello', { cwd })).toThrow(CliError);
		expect(fs.existsSync(path.join(cwd, 'src/theme.css'))).toBe(false);
	});
});

describe('theme payloads', () => {
	it('decodes a paste code', () => {
		expect(decodePasteCode(`  ${pasteCode(THEME)}\n`)).toBe(THEME);
		expect(() => decodePasteCode('nope')).toThrow(/starts with dsm1/);
		expect(() => decodePasteCode('dsm1.AAAA')).toThrow(/damaged/);
	});

	it('turns the builder fixture link into a theme file', () => {
		const file = themeFileFromLink(`https://docsmith.geodask.com/themes#theme=${LINK_FIXTURE}`);
		expect(file).toBe(themeFileFromLink(LINK_FIXTURE));
		expect(file).toMatch(/^\/\* Made with the svelte-docsmith theme builder/);
		expect(file).toContain('--primary: oklch(0.55 0.2 265);');
		expect(file).toMatch(/\.dark \{[^}]*--background: oklch\(0.18 0 0\);/);
	});

	it('rejects damaged links and newer versions', () => {
		expect(() => themeFileFromLink('#theme=not-a-link')).toThrow(/damaged/);
		const v2 = zlib.deflateRawSync(JSON.stringify({ v: 2, tokens: {} })).toString('base64url');
		expect(() => themeFileFromLink(v2)).toThrow(/version 2/);
	});
});

describe('the loopback server', () => {
	it('listens on 127.0.0.1 only and answers 404 elsewhere', async () => {
		const server = await startThemeServer('n', () => []);
		try {
			const res = await fetch(`http://127.0.0.1:${server.port}/`);
			expect(res.status).toBe(404);
			await expect(
				fetch(`http://[::1]:${server.port}/theme`, { method: 'POST' })
			).rejects.toThrow();
		} finally {
			server.close();
		}
	});

	it('rejects a wrong nonce without writing', async () => {
		let writes = 0;
		const server = await startThemeServer('right-nonce-1234', () => (writes++, []));
		try {
			const res = await fetch(`http://127.0.0.1:${server.port}/theme`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: form({ state: 'wrong-nonce-1234', file: THEME })
			});
			expect(res.status).toBe(403);
			expect(await res.text()).toContain('expired');
			expect(writes).toBe(0);
		} finally {
			server.close();
		}
	});

	it('rejects a body over 256 KB', async () => {
		let writes = 0;
		const server = await startThemeServer('n', () => (writes++, []));
		try {
			const res = await fetch(`http://127.0.0.1:${server.port}/theme`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: form({ state: 'n', file: 'x'.repeat(300 * 1024) })
			}).catch(() => undefined);
			if (res) expect(res.status).toBe(413);
			expect(writes).toBe(0);
		} finally {
			server.close();
		}
	});

	it('escapes what it echoes back', async () => {
		const server = await startThemeServer('n', () => {
			throw new CliError('<script>bad</script>');
		});
		try {
			const res = await fetch(`http://127.0.0.1:${server.port}/theme`, {
				method: 'POST',
				body: form({ state: 'n', file: THEME, back: 'javascript:alert(1)' })
			});
			const html = await res.text();
			expect(res.status).toBe(400);
			expect(html).not.toContain('<script>');
			expect(html).not.toContain('javascript:');
		} finally {
			server.close();
		}
	});
});

describe('svelte-docsmith theme', () => {
	it('writes the theme the browser sends with the right nonce', async () => {
		const cwd = scratch(config("\n\t\t\t// theme: 'ocean',"));
		const { url, done, lines } = start(cwd);
		const opened = await url;
		expect(opened.origin + opened.pathname).toBe('https://docsmith.geodask.com/themes');

		const res = await fetch(`http://127.0.0.1:${opened.searchParams.get('cli')}/theme`, {
			method: 'POST',
			body: form({
				state: opened.searchParams.get('state')!,
				file: THEME,
				back: 'https://docsmith.geodask.com/themes'
			})
		});
		const html = await res.text();
		expect(res.status).toBe(200);
		expect(html).toContain('Theme saved');
		expect(html).toContain('href="https://docsmith.geodask.com/themes"');
		await done;

		expect(read('src/theme.css')).toBe(THEME);
		expect(read('vite.config.ts')).toContain("theme: './src/theme.css',");
		expect(lines).toContain('Theme received from the browser:');
		// The server is closed once the theme lands.
		await expect(
			fetch(`http://127.0.0.1:${opened.searchParams.get('cli')}/theme`, { method: 'POST' })
		).rejects.toThrow();
	});

	it('confirms and exits when the config has no docsmith() call', async () => {
		const cwd = scratch('export default {};\n');
		const { url, done, lines } = start(cwd);
		const opened = await url;
		const res = await fetch(`http://127.0.0.1:${opened.searchParams.get('cli')}/theme`, {
			method: 'POST',
			body: form({ state: opened.searchParams.get('state')!, file: THEME })
		});
		const html = await res.text();
		expect(res.status).toBe(200);
		expect(html).toContain('Theme saved');
		expect(html).toContain('found no docsmith({ … }) call in vite.config.ts');
		await done;
		expect(read('src/theme.css')).toBe(THEME);
		expect(lines).toContain(
			"  found no docsmith({ … }) call in vite.config.ts: add theme: './src/theme.css' to it yourself"
		);
	});

	it('takes a pasted code when the config has no docsmith() call', async () => {
		const cwd = scratch('export default {};\n');
		const { url, done, lines, input } = start(cwd);
		await url;
		input.write(`${pasteCode(THEME)}\n`);
		await done;
		expect(read('src/theme.css')).toBe(THEME);
		expect(lines.some((l) => l.endsWith('Try again:'))).toBe(false);
		expect(lines).toContain('Theme received as a pasted code:');
	});

	it('takes a pasted code, and asks again after a bad one', async () => {
		const cwd = scratch(config(''));
		const { url, done, lines, input } = start(cwd);
		await url;
		input.write('not a code\n');
		await new Promise((r) => setTimeout(r, 20));
		expect(lines.at(-1)).toMatch(/Try again:$/);
		input.write(`${pasteCode(THEME)}\n`);
		await done;
		expect(read('src/theme.css')).toBe(THEME);
		expect(lines).toContain('Theme received as a pasted code:');
	});

	it('writes a --link without opening anything', async () => {
		const cwd = scratch(config(''));
		const lines: string[] = [];
		await run(['theme', '--link', `https://docsmith.geodask.com/themes#theme=${LINK_FIXTURE}`], {
			cwd,
			log: (line) => lines.push(line),
			openUrl: () => {
				throw new Error('should not open');
			}
		});
		expect(read('src/theme.css')).toContain('--primary: oklch(0.55 0.2 265);');
		expect(read('vite.config.ts')).toContain("theme: './src/theme.css',");
		expect(lines[0]).toBe('Theme received from the link:');
	});

	it('prints the link and opens nothing with --no-open', async () => {
		const cwd = scratch(config(''));
		const input = new PassThrough();
		const lines: string[] = [];
		const done = run(['theme', '--no-open', '--builder', 'http://localhost:5173/themes'], {
			cwd,
			log: (line) => lines.push(line),
			input,
			openUrl: () => {
				throw new Error('should not open');
			}
		});
		await new Promise((r) => setTimeout(r, 20));
		expect(lines.some((l) => l.includes('http://localhost:5173/themes?cli='))).toBe(true);
		input.write(`${pasteCode(THEME)}\n`);
		await done;
	});

	it('gives up after the timeout', async () => {
		const cwd = scratch(config(''));
		const { done } = start(cwd, [], new PassThrough(), 30);
		await expect(done).rejects.toThrow(/gave up waiting/);
	});

	it('rejects unknown options and missing values', async () => {
		await expect(run(['theme', '--colour', 'red'])).rejects.toThrow(/unknown option for theme/);
		await expect(run(['theme', '--file'])).rejects.toThrow(/--file needs a value/);
	});

	it('is listed in the help', async () => {
		const lines: string[] = [];
		await run([], { log: (line) => lines.push(line) });
		expect(lines.join('\n')).toContain('svelte-docsmith theme [options]');
		expect(lines.join('\n')).toContain('--link <url>');
	});
});
