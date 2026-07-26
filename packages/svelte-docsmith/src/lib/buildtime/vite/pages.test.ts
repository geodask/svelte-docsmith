import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readSourcePages, toPage, withCommitDates } from './pages.js';

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

// Pure: the caller walks git and hands the dates in, so these are literals and
// the suite never depends on this checkout's own history.
describe('withCommitDates', () => {
	const PAGE = path.resolve('/app/src/routes/docs/intro/+page.md');
	const dates = new Map([[PAGE, '2026-05-01']]);

	it('dates a page from the commit that last touched it', () => {
		const [page] = withCommitDates([toPage(PAGE, '---\ntitle: Intro\n---\n')], dates);

		expect(page.lastUpdated).toBe('2026-05-01');
	});

	it('prefers a frontmatter lastUpdated over the git date, so archives keep their real date', () => {
		const source = "---\ntitle: Intro\nlastUpdated: '2026-03-04'\n---\n";

		const [page] = withCommitDates([toPage(PAGE, source)], dates);

		expect(page.lastUpdated).toBe('2026-03-04');
	});

	it('leaves the date undefined for a page the walk never saw', () => {
		const [page] = withCommitDates([toPage(PAGE, '---\ntitle: Intro\n---\n')], new Map());

		expect(page.lastUpdated).toBeUndefined();
	});

	it('does not date an untitled page, which no index carries', () => {
		// The map really does hold a date for this file, so an undefined date here
		// can only mean the lookup was skipped.
		const [page] = withCommitDates([toPage(PAGE, '---\ndescription: a stub\n---\n')], dates);

		expect(page.lastUpdated).toBeUndefined();
	});
});
