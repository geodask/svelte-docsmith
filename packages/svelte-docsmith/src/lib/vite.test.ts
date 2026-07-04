import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { exampleSource } from './vite.js';

// Plugin hooks are typed as ObjectHook unions; in this plugin they are plain
// functions, so cast to call them directly with a fake Rollup plugin context.
type ResolveId = (this: unknown, id: string, importer?: string) => Promise<string | undefined>;
type Load = (this: unknown, id: string) => Promise<string | undefined>;

const PREFIX = '\0docsmith-source:';
const VIRTUAL_EXT = '.docsmith-src';

let fixture: string;

beforeAll(() => {
	fixture = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-')), 'Example.svelte');
	fs.writeFileSync(fixture, '<script>\n\tlet count = 0;\n</script>\n');
});

afterAll(() => {
	fs.rmSync(path.dirname(fixture), { recursive: true, force: true });
});

describe('exampleSource resolveId', () => {
	it('maps a *.svelte?source id to the virtual source module', async () => {
		const plugin = exampleSource();
		const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/abs/Foo.svelte' }) };
		const resolveId = plugin.resolveId as unknown as ResolveId;

		const resolved = await resolveId.call(ctx, 'Foo.svelte?source', '/importer');

		expect(ctx.resolve).toHaveBeenCalledWith('Foo.svelte', '/importer', { skipSelf: true });
		expect(resolved).toBe(PREFIX + '/abs/Foo.svelte' + VIRTUAL_EXT);
	});

	it('ignores ids without the ?source suffix', async () => {
		const plugin = exampleSource();
		const resolveId = plugin.resolveId as unknown as ResolveId;
		expect(await resolveId.call({ resolve: vi.fn() }, 'Foo.svelte')).toBeUndefined();
	});
});

describe('exampleSource load', () => {
	it('returns the highlighted file source as the default export and watches the file', async () => {
		const plugin = exampleSource();
		const ctx = { addWatchFile: vi.fn() };
		const load = plugin.load as unknown as Load;

		const out = await load.call(ctx, PREFIX + fixture + VIRTUAL_EXT);

		expect(ctx.addWatchFile).toHaveBeenCalledWith(fixture);
		expect(out).toMatch(/^export default /);
		expect(out).toContain('shiki');
		expect(out).toContain('count');
	});

	it('ignores ids it did not create', async () => {
		const plugin = exampleSource();
		const load = plugin.load as unknown as Load;
		expect(await load.call({ addWatchFile: vi.fn() }, '/some/other/id.js')).toBeUndefined();
	});
});
