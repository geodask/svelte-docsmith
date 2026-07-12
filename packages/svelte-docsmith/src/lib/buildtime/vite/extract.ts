import GithubSlugger from 'github-slugger';

export type TocEntry = { id: string; title: string; depth: 2 | 3 };

/** Strip inline markdown so a heading's TOC label is plain text. */
export function stripInlineMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[_~]/g, '')
		.trim();
}

/**
 * Reduce a markdown page to plain, searchable body text: prose and heading text
 * with frontmatter, `<script>`/`<style>` blocks, fenced code, HTML/Svelte tags,
 * and markdown punctuation removed. Feeds the generated search index. Code
 * samples are intentionally dropped to keep the index small and prose-focused.
 */
export function extractSearchText(source: string): string {
	let body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	// Component/setup blocks aren't prose; drop them whole before line scanning.
	body = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

	const out: string[] = [];
	let fence: string | null = null;

	for (const line of body.split('\n')) {
		const f = /^\s*(`{3,}|~{3,})/.exec(line);
		if (f) {
			const ch = f[1][0];
			if (fence === null) fence = ch;
			else if (ch === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;

		// Skip table delimiter rows (`| --- | :--: |`) — pure structure, no words.
		if (/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line)) continue;

		const text = stripInlineMarkdown(
			line
				.replace(/<[^>]+>/g, ' ') // strip HTML/Svelte tags, keep their text content
				.replace(/^\s{0,3}#{1,6}\s+/, '') // heading markers
				.replace(/^\s{0,3}>\s?/, '') // blockquote markers
				.replace(/^\s*[-*+]\s+/, '') // unordered list bullets
				.replace(/^\s*\d+\.\s+/, '') // ordered list markers
				.replace(/\s*\|\s*/g, ' ') // table cell separators → spaces, not "| a | b |"
		).replace(/\s+/g, ' ');

		if (text) out.push(text);
	}

	return out.join(' ');
}

/** Estimated reading time in whole minutes from a page's plain-text body. */
export function readingMinutes(text: string): number {
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

/**
 * Extract `h2`/`h3` headings from a markdown page so the in-page TOC can be
 * server-rendered (no post-hydration pop-in). Skips fenced code blocks. Ids are
 * produced with the same `github-slugger` that `rehype-slug` uses at render
 * time — including its duplicate-suffixing — so the SSR anchors match the real
 * heading ids exactly, not just for common cases.
 */
export function extractToc(source: string): TocEntry[] {
	const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	const slugger = new GithubSlugger();
	const toc: TocEntry[] = [];
	let fence: string | null = null;

	for (const line of body.split('\n')) {
		const f = /^\s*(`{3,}|~{3,})/.exec(line);
		if (f) {
			const ch = f[1][0];
			if (fence === null) fence = ch;
			else if (ch === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;

		const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
		if (!m) continue;
		const title = stripInlineMarkdown(m[2]);
		if (!title) continue;

		toc.push({ id: slugger.slug(title), title, depth: m[1].length as 2 | 3 });
	}
	return toc;
}

/**
 * The page's markdown body for LLM output: frontmatter and `<script>`/`<style>`
 * blocks removed, everything else (headings, prose, code, component tags) kept,
 * with the frontmatter title prepended as an `h1` (pages start their body at h2).
 */
export function extractLlmsContent(source: string, title: string): string {
	const body = source
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.trim();
	return `# ${title}\n\n${body}`;
}
