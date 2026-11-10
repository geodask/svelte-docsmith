import { describe, expect, it } from 'vitest';
import {
	installCommands,
	isInstallBlock,
	withoutInstallFlag,
	writeInstallBlocks
} from './install-block.js';

/** An install block's code for each manager, as `{ pnpm, npm, yarn, bun }`. */
const tabs = (code: string) =>
	Object.fromEntries(installCommands(code).map(({ manager, code }) => [manager, code]));

describe('isInstallBlock', () => {
	it('reads the bare pkg flag, wherever it sits among the meta', () => {
		expect(isInstallBlock('pkg')).toBe(true);
		expect(isInstallBlock('title="setup" pkg showLineNumbers')).toBe(true);
	});

	it('ignores pkg inside a value, and other words', () => {
		expect(isInstallBlock('title="pkg"')).toBe(false);
		expect(isInstallBlock('package')).toBe(false);
		expect(isInstallBlock(undefined)).toBe(false);
	});

	it('leaves the rest of the meta for the renderer', () => {
		expect(withoutInstallFlag('pkg title="Setup"')).toBe('title="Setup"');
		expect(withoutInstallFlag('title="pkg" pkg')).toBe('title="pkg"');
	});
});

describe('installCommands', () => {
	it('lists the managers in tab order: pnpm, npm, yarn, bun', () => {
		expect(installCommands('npm install').map(({ manager }) => manager)).toEqual([
			'pnpm',
			'npm',
			'yarn',
			'bun'
		]);
	});

	it.each([
		['npm install', 'pnpm install', 'yarn install', 'bun install'],
		['npm i', 'pnpm install', 'yarn install', 'bun install'],
		[
			'npm install svelte-docsmith',
			'pnpm add svelte-docsmith',
			'yarn add svelte-docsmith',
			'bun add svelte-docsmith'
		],
		['npm i -D a b', 'pnpm add -D a b', 'yarn add -D a b', 'bun add --dev a b'],
		['npm install --save-dev a', 'pnpm add -D a', 'yarn add -D a', 'bun add --dev a'],
		['npm i -E a', 'pnpm add -E a', 'yarn add -E a', 'bun add --exact a'],
		['npx sv create', 'pnpm dlx sv create', 'yarn dlx sv create', 'bunx sv create'],
		[
			'npm create svelte-docsmith@latest my-docs',
			'pnpm create svelte-docsmith my-docs',
			'yarn create svelte-docsmith my-docs',
			'bun create svelte-docsmith my-docs'
		],
		[
			'npm create vite@latest app -- --template svelte',
			'pnpm create vite app --template svelte',
			'yarn create vite app --template svelte',
			'bun create vite app --template svelte'
		],
		['npm run dev -- --open', 'pnpm run dev --open', 'yarn run dev --open', 'bun run dev --open'],
		[
			'cd my-docs && npm install',
			'cd my-docs && pnpm install',
			'cd my-docs && yarn install',
			'cd my-docs && bun install'
		]
	])('converts `%s`', (npm, pnpm, yarn, bun) => {
		expect(tabs(npm)).toEqual({ pnpm, npm, yarn, bun });
	});

	it.each(['npm ci', 'npm i -g svelte-docsmith', 'npx -y sv create', 'npm init -y', 'npm test'])(
		'shows `%s` the same in every tab, rather than guessing',
		(npm) => {
			expect(tabs(npm)).toEqual({ pnpm: npm, npm, yarn: npm, bun: npm });
		}
	);

	it('decides line by line, keeping comments, blank lines and indentation', () => {
		const code = '# add it\nnpm i a\n\n  npm ci\n';
		expect(tabs(code).pnpm).toBe('# add it\npnpm add a\n\n  npm ci');
		expect(tabs(code).npm).toBe('# add it\nnpm i a\n\n  npm ci');
	});
});

describe('writeInstallBlocks', () => {
	it('writes each install block as one fence with every manager’s commands', () => {
		expect(writeInstallBlocks('Install:\n\n```sh pkg\nnpm i a\n```\n\nDone.')).toBe(
			'Install:\n\n```sh\n# pnpm\npnpm add a\n# npm\nnpm i a\n# yarn\nyarn add a\n# bun\nbun add a\n```\n\nDone.'
		);
	});

	it('keeps an indented block’s indentation', () => {
		expect(writeInstallBlocks('1. Step\n\n   ```sh pkg\n   npm i a\n   ```')).toBe(
			'1. Step\n\n   ```sh\n   # pnpm\n   pnpm add a\n   # npm\n   npm i a\n   # yarn\n   yarn add a\n   # bun\n   bun add a\n   ```'
		);
	});

	it('leaves other fences, and install blocks shown inside a sample, as written', () => {
		const sample = '````md\n```sh pkg\nnpm i a\n```\n````\n\n```sh\nnpm i b\n```';
		expect(writeInstallBlocks(sample)).toBe(sample);
	});
});
