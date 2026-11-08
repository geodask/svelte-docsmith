/**
 * `svelte-docsmith theme`: build a theme in the browser and land it in the
 * project (the CLI handoff, ADR-0012).
 *
 * The command listens on 127.0.0.1 at a random port with a one-time nonce and
 * opens the theme builder with `?cli=<port>&state=<nonce>`. The builder's
 * "Send to my project" is a top-level form POST of the theme file to that
 * port. When the browser can't reach this machine (a remote shell, a
 * container), the builder shows a paste code instead, which this command reads
 * from the terminal. Either way it writes the theme file and points
 * `docsmith({ theme })` at it.
 *
 * `--link` skips the browser: it writes the theme a theme link carries, which
 * is how a link from a teammate or an agent lands in one step.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import zlib from 'node:zlib';
import type { Readable } from 'node:stream';
import {
	PASTE_CODE_PREFIX,
	ThemeLinkError,
	readThemeLinkJson,
	themeLinkPayload,
	toThemeFile
} from '../../core/theme-link.js';
import { CliError } from './error.js';

export const DEFAULT_BUILDER = 'https://docsmith.geodask.com/themes';
const DEFAULT_FILE = 'src/theme.css';
const MAX_BODY = 256 * 1024;
const TIMEOUT_MS = 15 * 60 * 1000;
const CONFIG_FILES = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts'];

export const THEME_HELP = `Usage:
  svelte-docsmith theme [options]

Open the theme builder in your browser, then write the theme you send from it
into this project: the theme file (default src/theme.css) and the theme option
in your vite.config's docsmith() call. If the browser can't reach this
terminal, paste the code the builder shows at the prompt instead.

Options:
  --link <url>     write the theme a theme link carries, without the browser
  --file <path>    where to write the theme file (default: ${DEFAULT_FILE})
  --config <file>  vite config to update (default: vite.config.* here)
  --builder <url>  theme builder to open (default: ${DEFAULT_BUILDER})
  --no-open        print the builder link instead of opening a browser
`;

export type ThemeArgs = {
	link?: string;
	file: string;
	config?: string;
	builder: string;
	open: boolean;
};

/** Parse `theme`'s flags. */
export function parseThemeArgs(rest: string[]): ThemeArgs {
	const args: ThemeArgs = { file: DEFAULT_FILE, builder: DEFAULT_BUILDER, open: true };
	const value = (flag: string, i: number) => {
		const v = rest[i];
		if (!v || v.startsWith('--')) throw new CliError(`${flag} needs a value.\n\n${THEME_HELP}`);
		return v;
	};
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === '--link') args.link = value(arg, ++i);
		else if (arg === '--file') args.file = value(arg, ++i);
		else if (arg === '--config') args.config = value(arg, ++i);
		else if (arg === '--builder') args.builder = value(arg, ++i);
		else if (arg === '--no-open') args.open = false;
		else throw new CliError(`unknown option for theme: ${arg}\n\n${THEME_HELP}`);
	}
	return args;
}

// ------------------------------------------------------------ theme payloads

/** A paste code from the builder: `dsm1.` and the theme file, deflated. */
export function decodePasteCode(code: string): string {
	const text = code.trim();
	if (
		!text.startsWith(PASTE_CODE_PREFIX) ||
		!/^[\w-]+$/.test(text.slice(PASTE_CODE_PREFIX.length))
	) {
		throw new CliError(`that isn't a builder code: it starts with ${PASTE_CODE_PREFIX}`);
	}
	try {
		return zlib
			.inflateRawSync(Buffer.from(text.slice(PASTE_CODE_PREFIX.length), 'base64url'))
			.toString('utf8');
	} catch {
		throw new CliError('that code is damaged: copy it from the builder again.');
	}
}

/**
 * The theme file a theme link carries. Takes the whole link or just its
 * `#theme=` payload. The format is documented on /docs/theming and lives in
 * core/theme-link.ts, which the theme builder shares.
 */
export function themeFileFromLink(link: string): string {
	let json: string;
	try {
		json = zlib.inflateRawSync(Buffer.from(themeLinkPayload(link), 'base64url')).toString('utf8');
	} catch {
		throw new CliError("that theme link is damaged: it doesn't decode.");
	}
	try {
		return toThemeFile(readThemeLinkJson(json).tokens);
	} catch (error) {
		if (!(error instanceof ThemeLinkError)) throw error;
		throw new CliError(
			{
				damaged: "that theme link is damaged: it doesn't decode.",
				version: `that theme link is version ${error.version}; this svelte-docsmith reads version 1. Update the package.`,
				'no-tokens': 'that theme link carries no tokens.'
			}[error.reason]
		);
	}
}

// ------------------------------------------------------------- writing it

export type WriteOptions = { cwd: string; file?: string; config?: string };

/**
 * Write the theme file and set `theme` in the `docsmith({ … })` call. A
 * `theme:` entry already there (set, or commented out as the scaffold leaves
 * it) is replaced; otherwise one is added as the call's first option. With no
 * vite config or no `docsmith({` call, the last line says what to add by hand.
 * Returns a line per change, for the terminal and the browser's "saved" page.
 */
export function writeTheme(
	source: string,
	{ cwd, file = DEFAULT_FILE, config }: WriteOptions
): string[] {
	if (!/:root\s*\{/.test(source)) {
		throw new CliError("that isn't a theme file: it has no :root { … } block.");
	}
	const target = path.resolve(cwd, file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, source.endsWith('\n') ? source : `${source}\n`);
	const changes = [`wrote ${path.relative(cwd, target)}`];

	const configFile = config
		? path.resolve(cwd, config)
		: CONFIG_FILES.map((f) => path.join(cwd, f)).find((f) => fs.existsSync(f));
	// The theme file is written either way, so a config we can't edit is a
	// note for the user, not a failure: the command still confirms and exits.
	if (!configFile || !fs.existsSync(configFile)) {
		changes.push(
			`found no vite.config here: add theme: '${relativeTo(cwd, target)}' to docsmith() yourself`
		);
		return changes;
	}

	const value = `theme: '${relativeTo(path.dirname(configFile), target)}'`;
	const code = fs.readFileSync(configFile, 'utf8');
	const call = code.search(/\bdocsmith\(\s*\{/);
	if (call === -1) {
		changes.push(
			`found no docsmith({ … }) call in ${path.basename(configFile)}: add ${value} to it yourself`
		);
		return changes;
	}
	const head = code.slice(0, call);
	const body = code.slice(call);
	const existing = /(\/\/\s*)?(?<![\w$])theme\s*:\s*(['"`])[^'"`\n]*\2/;
	const updated = existing.test(body)
		? body.replace(existing, value)
		: body.replace(/docsmith\(\s*\{/, (open) => `${open}\n\t\t\t${value},`);
	fs.writeFileSync(configFile, head + updated);
	changes.push(`set ${value} in ${path.basename(configFile)}`);
	return changes;
}

/** A `./`-relative, forward-slashed path from `dir` to `file`, as a config writes it. */
function relativeTo(dir: string, file: string) {
	const rel = path.relative(dir, file).split(path.sep).join('/');
	return rel.startsWith('.') ? rel : `./${rel}`;
}

// ---------------------------------------------------------------- the server

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title: string, body: string, back?: string) {
	const link = back ? `<p><a href="${escape(back)}">Back to the theme builder</a></p>` : '';
	return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escape(title)}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;color:#222}code{background:#f2f2f2;padding:0 .3em;border-radius:4px}</style>
<h1>${escape(title)}</h1>${body}${link}</html>`;
}

export type ThemeServer = {
	port: number;
	/** Settles with the change lines once a valid theme arrives and is written. */
	received: Promise<string[]>;
	close(): void;
};

/**
 * Listen on 127.0.0.1 for the builder's form POST to `/theme`. Only a body
 * carrying `nonce` is accepted; the theme is handed to `write`, and the reply
 * is a small page saying what changed.
 */
export function startThemeServer(
	nonce: string,
	write: (file: string) => string[]
): Promise<ThemeServer> {
	let resolveReceived!: (changes: string[]) => void;
	const received = new Promise<string[]>((r) => (resolveReceived = r));
	const want = Buffer.from(nonce);

	const server = http.createServer((req, res) => {
		if (req.method !== 'POST' || req.url !== '/theme') {
			res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
			return;
		}
		const chunks: Buffer[] = [];
		let size = 0;
		req.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY) {
				res.writeHead(413, { 'content-type': 'text/plain', connection: 'close' }).end('Too large');
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (res.writableEnded) return;
			const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
			const back = /^https?:\/\//.test(form.get('back') ?? '') ? form.get('back')! : undefined;
			const got = Buffer.from(form.get('state') ?? '');
			if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
				res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
				res.end(
					page(
						'This link has expired',
						'<p>Run <code>npx svelte-docsmith theme</code> again and send from the tab it opens.</p>',
						back
					)
				);
				return;
			}
			try {
				const changes = write(form.get('file') ?? '');
				res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
				res.end(
					page(
						'Theme saved',
						`<ul>${changes.map((c) => `<li>${escape(c)}</li>`).join('')}</ul><p>You can close this tab. A running dev server picks the theme up straight away.</p>`,
						back
					)
				);
				resolveReceived(changes);
			} catch (error) {
				res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
				res.end(
					page("Couldn't save the theme", `<p>${escape((error as Error).message)}</p>`, back)
				);
			}
		});
	});

	return new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as { port: number };
			resolve({ port, received, close: () => server.close() });
		});
	});
}

// --------------------------------------------------------------- the command

export type ThemeIo = {
	cwd?: string;
	log?: (line: string) => void;
	/** Where pasted codes come from (default: stdin). */
	input?: Readable;
	/** Open a URL in a browser (default: the platform's opener). */
	openUrl?: (url: string) => void;
	timeoutMs?: number;
};

function openInBrowser(url: string, log: (line: string) => void) {
	const [cmd, args] =
		process.platform === 'darwin'
			? ['open', [url]]
			: process.platform === 'win32'
				? ['cmd', ['/c', 'start', '', url]]
				: ['xdg-open', [url]];
	spawn(cmd, args as string[], { stdio: 'ignore', detached: true })
		.on('error', () => log("Couldn't open a browser: open the link above yourself."))
		.unref();
}

/** Run `svelte-docsmith theme`. Resolves once a theme is written. */
export async function themeCommand(args: ThemeArgs, io: ThemeIo = {}): Promise<void> {
	const cwd = io.cwd ?? process.cwd();
	const log = io.log ?? ((line: string) => console.log(line));
	const write = (source: string) =>
		writeTheme(source, { cwd, file: args.file, config: args.config });
	const report = (changes: string[], via: string) => {
		log(`Theme received ${via}:`);
		for (const change of changes) log(`  ${change}`);
	};

	if (args.link) {
		report(write(themeFileFromLink(args.link)), 'from the link');
		return;
	}

	const nonce = crypto.randomBytes(16).toString('base64url');
	const server = await startThemeServer(nonce, write);
	const url = new URL(args.builder);
	url.searchParams.set('cli', String(server.port));
	url.searchParams.set('state', nonce);

	log('Build a theme in the browser, then press "Send to my project".');
	log(`  ${url.href}`);
	if (args.open) (io.openUrl ?? ((u) => openInBrowser(u, log)))(url.href);

	const rl = readline.createInterface({ input: io.input ?? process.stdin, terminal: false });
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			server.received.then((changes) => report(changes, 'from the browser')),
			new Promise<void>((resolve) => {
				log("If the browser can't reach this terminal, paste the builder's code here:");
				rl.on('line', (line) => {
					if (!line.trim()) return;
					try {
						report(write(decodePasteCode(line)), 'as a pasted code');
						resolve();
					} catch (error) {
						log(`${(error as Error).message} Try again:`);
					}
				});
			}),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() =>
						reject(
							new CliError('gave up waiting for a theme after 15 minutes. Run the command again.')
						),
					io.timeoutMs ?? TIMEOUT_MS
				);
			})
		]);
	} finally {
		clearTimeout(timer);
		rl.close();
		server.close();
	}
}
