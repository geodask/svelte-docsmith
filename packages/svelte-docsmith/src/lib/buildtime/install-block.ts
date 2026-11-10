/**
 * Install blocks: a fence with a `pkg` flag after its language holds npm
 * commands, and readers see one tab per package manager.
 *
 * ```sh pkg
 * npm install -D svelte-docsmith
 * ```
 *
 * {@link installCommands} turns the fence's code into each manager's version,
 * one line at a time. The code block renderer draws them as synced tabs, and
 * agent markdown writes them all out with {@link writeInstallBlocks}, so a
 * reader and an agent get the same four commands.
 *
 * Only commands with a clear equivalent are converted: `npm install`/`npm i`
 * (bare, or with packages and `-D`/`-E`), `npx`, `npm create`/`npm init <x>`
 * and `npm run`. A line holding anything else, such as `npm ci` or an unknown
 * flag, is shown the same in every tab rather than guessed at. Lines that
 * aren't npm commands (`cd my-docs`, comments) pass through as they are.
 *
 * Pure, and safe anywhere: no Node or Svelte imports.
 */

/** The managers an install block shows, in tab order. */
export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

/** One manager's version of an install block. */
export type InstallCommands = { manager: PackageManager; code: string };

/** The bare flag that marks a fence as an install block: ```sh pkg */
const FLAG = 'pkg';

/** `title="a b"` and friends, removed before looking for bare flags. */
const KEY_VALUE = /(\w+)=(?:"[^"]*"|'[^']*'|\S+)/g;

/** Whether a fence's meta marks it as an install block. */
export function isInstallBlock(meta?: string | null): boolean {
	if (!meta) return false;
	return meta.replace(KEY_VALUE, ' ').split(/\s+/).includes(FLAG);
}

/** The fence's meta without the `pkg` flag, for the rest of the renderer. */
export function withoutInstallFlag(meta?: string | null): string {
	if (!meta) return '';
	// Key=value pairs are matched first and kept, so a `pkg` inside a quoted
	// title stays: the same reading `isInstallBlock` makes.
	return meta
		.replace(
			new RegExp(String.raw`(\w+=(?:"[^"]*"|'[^']*'|\S+))|(^|\s)${FLAG}(?=\s|$)`, 'g'),
			(match, pair: string | undefined, space: string | undefined) => pair ?? space ?? match
		)
		.trim();
}

/** `-D` and `-E` in each manager's spelling, keyed by every npm spelling. */
const ADD_FLAGS: Record<string, Record<Exclude<PackageManager, 'npm'>, string>> = {
	'-D': { pnpm: '-D', yarn: '-D', bun: '--dev' },
	'--save-dev': { pnpm: '-D', yarn: '-D', bun: '--dev' },
	'-E': { pnpm: '-E', yarn: '-E', bun: '--exact' },
	'--save-exact': { pnpm: '-E', yarn: '-E', bun: '--exact' }
};

/** One npm command (no `&&`) for another manager, or `undefined` if it has no clear equivalent. */
function convertCommand(
	command: string,
	manager: Exclude<PackageManager, 'npm'>
): string | undefined {
	const [tool, ...rest] = command.split(/\s+/).filter(Boolean);
	if (tool === 'npx') {
		// `npx -y x` and friends carry npx's own flags, which dlx doesn't share.
		if (!rest.length || rest[0].startsWith('-')) return undefined;
		return [manager === 'bun' ? 'bunx' : `${manager} dlx`, ...rest].join(' ');
	}
	if (tool !== 'npm') return command;

	const [sub, ...args] = rest;
	switch (sub) {
		case 'install':
		case 'i':
		case 'add': {
			const flags = args.filter((arg) => arg.startsWith('-'));
			const packages = args.filter((arg) => !arg.startsWith('-'));
			if (!packages.length) return flags.length ? undefined : `${manager} install`;
			if (flags.some((flag) => !(flag in ADD_FLAGS))) return undefined;
			const spelled = [...new Set(flags.map((flag) => ADD_FLAGS[flag][manager]))];
			return [manager, 'add', ...spelled, ...packages].join(' ');
		}
		case 'create':
		case 'init': {
			const [starter, ...more] = args;
			if (!starter || starter.startsWith('-')) return undefined;
			// npm needs `--` before the starter's own flags; the others don't.
			const passed = more.filter((arg) => arg !== '--');
			return [manager, 'create', starter.replace(/@latest$/, ''), ...passed].join(' ');
		}
		case 'run':
		case 'run-script': {
			const [script, ...more] = args;
			if (!script || script.startsWith('-')) return undefined;
			const dash = more.indexOf('--');
			const passed = dash === -1 ? more : [...more.slice(0, dash), ...more.slice(dash + 1)];
			return [manager, 'run', script, ...passed].join(' ');
		}
		default:
			return undefined;
	}
}

/** One line for another manager, or `undefined` if any npm command in it has no clear equivalent. */
function convertLine(line: string, manager: Exclude<PackageManager, 'npm'>): string | undefined {
	const indent = /^\s*/.exec(line)![0];
	const body = line.slice(indent.length).trimEnd();
	if (!body || body.startsWith('#')) return line;
	const parts = body.split(/\s+&&\s+/).map((part) => convertCommand(part, manager));
	if (parts.some((part) => part === undefined)) return undefined;
	return indent + parts.join(' && ');
}

/** An install block's code for each manager, in tab order. */
export function installCommands(code: string): InstallCommands[] {
	const lines = code.replace(/\n$/, '').split('\n');
	const others = PACKAGE_MANAGERS.filter((m): m is Exclude<PackageManager, 'npm'> => m !== 'npm');
	// Decide per line, so a line that can't be converted for one manager is
	// shown as written in all of them rather than converted in some.
	const converted = lines.map((line) => {
		const versions = Object.fromEntries(others.map((m) => [m, convertLine(line, m)]));
		return Object.values(versions).some((v) => v === undefined) ? undefined : versions;
	});
	return PACKAGE_MANAGERS.map((manager) => ({
		manager,
		code: lines
			.map((line, i) => (manager === 'npm' ? line : (converted[i]?.[manager] ?? line)))
			.join('\n')
	}));
}

/** A fence opener: indentation, the marker run, and the info string. */
const FENCE_OPEN = /^([ \t]*)(`{3,}|~{3,})(.*)$/;

/**
 * `markdown` with every install block written out for agents: one fence of
 * the same language holding each manager's commands under a `# <manager>`
 * comment. A fence inside another fence is sample code, and is left alone.
 */
export function writeInstallBlocks(markdown: string): string {
	// Pages aren't normalised, so a Windows checkout's CRLF lines are read
	// without their \r and written back with it.
	const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
	const lines = markdown.split(/\r?\n/);
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const open = FENCE_OPEN.exec(lines[i]);
		if (!open || (open[2][0] === '`' && open[3].includes('`'))) {
			out.push(lines[i]);
			continue;
		}
		const [, indent, marker, info] = open;
		const closer = new RegExp(
			String.raw`^[ \t]*${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \t]*$`
		);
		const closeAt = lines.findIndex((line, j) => j > i && closer.test(line));
		const end = closeAt === -1 ? lines.length : closeAt;
		const body = lines.slice(i + 1, end);
		const [lang = '', ...meta] = info.trim().split(/\s+/);
		if (isInstallBlock(meta.join(' '))) {
			const code = body.map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line));
			const written = installCommands(code.join('\n')).flatMap(({ manager, code }) => [
				`# ${manager}`,
				code
			]);
			out.push(
				`${indent}${marker}${lang}`,
				...written
					.join('\n')
					.split('\n')
					.map((line) => indent + line),
				`${indent}${marker}`
			);
		} else {
			out.push(lines[i], ...body, ...(closeAt === -1 ? [] : [lines[end]]));
		}
		i = end;
	}
	return out.join(eol);
}
