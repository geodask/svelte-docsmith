#!/usr/bin/env node
/**
 * PROTOTYPE — throwaway. What `npx svelte-docsmith theme` could do:
 *
 *   1. Start a loopback server on 127.0.0.1 at a random port, with a one-time
 *      nonce.
 *   2. Open the builder at <builder>?cli=<port>&state=<nonce>.
 *   3. Wait for either:
 *        - the builder's "Send to my project" (a form POST to /theme), or
 *        - a paste code typed into this terminal (the fallback for when the
 *          browser can't reach this machine: a remote shell, a container, a
 *          browser that blocks it).
 *   4. Write src/theme.css and point docsmith({ theme }) at it.
 *
 * Run it in a project:  node <this file> [--builder <url>] [--cwd <dir>] [--no-open]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const builder = flag('builder', 'https://docsmith.geodask.com/themes?variant=B');
const cwd = path.resolve(flag('cwd', process.cwd()));
const shouldOpen = !args.includes('--no-open');
const nonce = crypto.randomBytes(16).toString('base64url');
const themePath = path.join(cwd, 'src/theme.css');

function log(...m) {
	console.log('[svelte-docsmith]', ...m);
}

/** Write the theme file and set `theme` in vite.config. Returns what changed. */
function apply(file) {
	if (!/:root\s*\{/.test(file)) throw new Error('that is not a theme file');
	fs.mkdirSync(path.dirname(themePath), { recursive: true });
	fs.writeFileSync(themePath, file);
	const config = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']
		.map((f) => path.join(cwd, f))
		.find((f) => fs.existsSync(f));
	if (!config)
		return [
			`wrote ${path.relative(cwd, themePath)}`,
			"no vite.config found: add theme: './src/theme.css' to docsmith()"
		];
	let src = fs.readFileSync(config, 'utf8');
	const value = "theme: './src/theme.css'";
	if (/(^|[\s,{])(\/\/\s*)?theme\s*:\s*['"][^'"]*['"],?/m.test(src)) {
		src = src.replace(/(\/\/\s*)?theme\s*:\s*['"][^'"]*['"]/, value);
	} else if (/docsmith\(\s*\{/.test(src)) {
		src = src.replace(/docsmith\(\s*\{/, (m) => `${m}\n\t\t\t${value},`);
	} else {
		return [
			`wrote ${path.relative(cwd, themePath)}`,
			`couldn't find docsmith({ … }) in ${path.basename(config)}: add ${value}`
		];
	}
	fs.writeFileSync(config, src);
	return [`wrote ${path.relative(cwd, themePath)}`, `set ${value} in ${path.basename(config)}`];
}

function decodePasteCode(code) {
	const m = code.trim().match(/^dsm1\.([\w-]+)$/);
	if (!m) throw new Error('that is not a builder code (it starts with dsm1.)');
	return zlib.inflateRawSync(Buffer.from(m[1], 'base64url')).toString('utf8');
}

let done = false;
function finish(changes, via) {
	if (done) return;
	done = true;
	log(`theme received ${via}:`);
	for (const c of changes) log(`  ${c}`);
	rl.close();
	server.close();
	setTimeout(() => process.exit(0), 50);
}

const page = (title, body, back) => `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>body{font:16px/1.5 system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem}code{background:#eee;padding:0 .25em;border-radius:3px}</style>
<h1>${title}</h1>${body}${back ? `<p><a href="${back.replace(/"/g, '&quot;')}">Back to the builder</a></p>` : ''}`;

const server = http.createServer((req, res) => {
	if (req.method !== 'POST' || req.url !== '/theme') {
		res.writeHead(404).end();
		return;
	}
	let body = '';
	req.on('data', (chunk) => {
		body += chunk;
		if (body.length > 256 * 1024) req.destroy();
	});
	req.on('end', () => {
		const form = new URLSearchParams(body);
		const got = Buffer.from(form.get('state') ?? '');
		const want = Buffer.from(nonce);
		const back = (form.get('back') ?? '').startsWith('http') ? form.get('back') : '';
		log(`POST /theme from origin ${req.headers.origin ?? '(none)'}`);
		if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
			res.writeHead(403, { 'content-type': 'text/html' });
			res.end(
				page(
					'This link has expired',
					'<p>Run <code>npx svelte-docsmith theme</code> again.</p>',
					back
				)
			);
			return;
		}
		try {
			const changes = apply(form.get('file') ?? '');
			res.writeHead(200, { 'content-type': 'text/html' });
			res.end(
				page(
					'Theme saved',
					`<ul>${changes.map((c) => `<li>${c}</li>`).join('')}</ul><p>You can close this tab. Your dev server picks the theme up straight away.</p>`,
					back
				)
			);
			finish(changes, 'from the browser');
		} catch (e) {
			res.writeHead(400, { 'content-type': 'text/html' });
			res.end(page("Couldn't save the theme", `<p>${e.message}</p>`, back));
		}
	});
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

server.listen(0, '127.0.0.1', () => {
	const { port } = server.address();
	const url = new URL(builder);
	url.searchParams.set('cli', String(port));
	url.searchParams.set('state', nonce);
	log('opening the theme builder. Build a theme there and press "Send to my project".');
	log(`  ${url}`);
	if (shouldOpen) {
		const cmd =
			process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
		const cmdArgs = process.platform === 'win32' ? ['/c', 'start', '', url.href] : [url.href];
		spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true })
			.on('error', () => log("couldn't open a browser: open the link yourself"))
			.unref();
	}
	const ask = () =>
		rl.question('Or paste the code from the builder: ', (answer) => {
			if (done) return;
			try {
				finish(apply(decodePasteCode(answer)), 'as a pasted code');
			} catch (e) {
				log(e.message);
				ask();
			}
		});
	ask();
});

setTimeout(
	() => {
		log('gave up waiting after 15 minutes.');
		process.exit(1);
	},
	15 * 60 * 1000
).unref();
