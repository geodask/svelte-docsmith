import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createPropsReader } from './reader.js';

const root = path.resolve(import.meta.dirname, '../../../..');
const fixture = (name: string) => path.join(import.meta.dirname, '_fixtures', `${name}.svelte`);
const hook = () => ({ addWatchFile: vi.fn(), warn: vi.fn() });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-reader-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** A fresh component file, so no earlier test has extracted (and warned about) it. */
function untypedComponent(name: string) {
	const file = path.join(tmp, `${name}.svelte`);
	fs.writeFileSync(file, '<script>\n\tlet { a } = $props();\n</script>\n');
	return file;
}

// The first read builds a TypeScript program: seconds on a cold coverage run.
describe('createPropsReader', { timeout: 60_000 }, () => {
	it('reads props and watches every file they were read from', async () => {
		const reader = createPropsReader();
		reader.configure(root);
		const ctx = hook();

		const { props } = await reader.read(fixture('notice'), ctx);

		expect(props.name).toBe('Notice');
		expect(ctx.addWatchFile).toHaveBeenCalledWith(fixture('notice'));
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.join(import.meta.dirname, '_fixtures', 'types.ts')
		);
		expect(ctx.warn).not.toHaveBeenCalled();
	});

	it('warns once per extraction, not once per hook that asks', async () => {
		const reader = createPropsReader();
		reader.configure(root);
		const file = untypedComponent('once');
		const first = hook();
		const second = hook();

		await reader.read(file, first);
		await reader.read(file, second);

		expect(first.warn).toHaveBeenCalledTimes(1);
		expect(first.warn).toHaveBeenCalledWith(expect.stringContaining('no type annotation'));
		expect(second.warn).not.toHaveBeenCalled();
		// Watching is per hook: each one that reads must re-run on an edit.
		expect(second.addWatchFile).toHaveBeenCalledWith(file);
	});

	it('warns once when two hooks ask at the same time', async () => {
		const reader = createPropsReader();
		reader.configure(root);
		const file = untypedComponent('concurrent');
		const a = hook();
		const b = hook();

		await Promise.all([reader.read(file, a), reader.read(file, b)]);

		expect(a.warn.mock.calls.length + b.warn.mock.calls.length).toBe(1);
	});

	it('warns again once the component changes', async () => {
		const reader = createPropsReader();
		reader.configure(root);
		const file = untypedComponent('edited');
		await reader.read(file, hook());

		fs.writeFileSync(file, '<script>\n\tlet { a, b } = $props();\n</script>\n');
		// mtime resolution can be coarse; force a distinct timestamp.
		const later = new Date(Date.now() + 5000);
		fs.utimesSync(file, later, later);
		const after = hook();
		const { props } = await reader.read(file, after);

		expect(props.props.map((p) => p.name)).toEqual(['a', 'b']);
		expect(after.warn).toHaveBeenCalledTimes(1);
	});

	it('shares one extraction between readers for the same root', async () => {
		const file = untypedComponent('shared');
		const client = createPropsReader();
		const server = createPropsReader();
		client.configure(root);
		server.configure(root);
		const first = hook();
		const second = hook();

		await client.read(file, first);
		await server.read(file, second);

		// The server build is served the client build's result, warnings and all.
		expect(first.warn).toHaveBeenCalledTimes(1);
		expect(second.warn).not.toHaveBeenCalled();
	});
});
