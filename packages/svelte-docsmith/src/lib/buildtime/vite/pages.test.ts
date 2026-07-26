import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readSourcePages, toPage, withCommitDates } from './pages.js';

/** A file this repo tracks, so git really has a commit date for it. */
const TRACKED = path.resolve('src/lib/buildtime/vite/pages.ts');

let root: string;

function writePage(relDir: string, contents: string) {
	const dir = path.join(root, relDir);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.md'), contents);
}

afterEach(() => {
	if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe('readSourcePages', () => {
	it('reads every page under the docs root with its source and parsed frontmatter', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
		writePage('introduction', '---\ntitle: Introduction\norder: 1\n---\n\n# body\n');

		const { pages, exists } = readSourcePages(root);

		expect(exists).toBe(true);
		expect(pages).toHaveLength(1);
		expect(pages[0].file).toBe(path.join(root, 'introduction', '+page.md'));
		expect(pages[0].source).toContain('# body');
		expect(pages[0].frontmatter).toEqual({ title: 'Introduction', order: 1 });
	});

	it('walks nested directories and ignores files that are not doc pages', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
		writePage('guides/deep/nested', '---\ntitle: Nested\n---\n');
		fs.writeFileSync(path.join(root, 'notes.md'), '# not a route');

		const { pages } = readSourcePages(root);

		expect(pages.map((p) => path.relative(root, p.file))).toEqual([
			path.join('guides', 'deep', 'nested', '+page.md')
		]);
	});

	it('reports a missing docs root rather than passing off an empty one', () => {
		expect(readSourcePages('/no/such/dir')).toEqual({ pages: [], exists: false });
	});

	it('reads a page without frontmatter as an empty frontmatter object', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
		writePage('bare', '# just a body\n');

		expect(readSourcePages(root).pages[0].frontmatter).toEqual({});
	});
});

describe('withCommitDates', () => {
	it('dates a page from the commit that last touched it', () => {
		const [page] = withCommitDates([toPage(TRACKED, '---\ntitle: Pages\n---\n')]);

		expect(page.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('prefers a frontmatter lastUpdated over the git date, so archives keep their real date', () => {
		const source = "---\ntitle: Pages\nlastUpdated: '2026-03-04'\n---\n";

		const [page] = withCommitDates([toPage(TRACKED, source)]);

		expect(page.lastUpdated).toBe('2026-03-04');
	});

	it('leaves the date undefined for a page outside a repository', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
		const file = path.join(root, '+page.md');

		const [page] = withCommitDates([toPage(file, '---\ntitle: Loose\n---\n')]);

		expect(page.lastUpdated).toBeUndefined();
	});

	it('does not date an untitled page, which no index carries', () => {
		// TRACKED really does have a commit date, so an undefined date here can
		// only mean the lookup was skipped.
		const [page] = withCommitDates([toPage(TRACKED, '---\ndescription: a stub\n---\n')]);

		expect(page.lastUpdated).toBeUndefined();
	});
});
