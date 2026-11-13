import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import type { ReaderEvent } from '#lib/core/reader-events.js';

// The author's handler, as the docsmith() plugin would serve it. Swapped per
// test through `reader.handler`, so one test can leave it out or make it throw.
const reader = vi.hoisted(() => ({
	handler: undefined as ((event: unknown) => void) | undefined
}));
vi.mock('svelte-docsmith/reader-events', () => ({
	get handler() {
		return reader.handler;
	}
}));
// Where the reader is. Swapped per test through `location.url`.
const location = vi.hoisted(() => ({ url: new URL('http://localhost/docs/intro') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return location.url;
		}
	}
}));

import { report } from './reader-events.js';
import PageFeedback from './layouts/page-feedback.svelte';
import CopyPageMenu from './layouts/copy-page-menu.svelte';
import Pre from './markdown/pre.svelte';
import LiveExample from './docs/live-example.svelte';

let events: ReaderEvent[];
beforeEach(() => {
	events = [];
	location.url = new URL('http://localhost/docs/intro');
	reader.handler = (event) => events.push(event as ReaderEvent);
	vi.stubGlobal('navigator', {
		...navigator,
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
	});
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('# Intro')));
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('report', () => {
	it('hands the handler what happened, on the page the reader is on', () => {
		report({ type: 'feedback', vote: 'up' });
		expect(events).toEqual([{ type: 'feedback', path: '/docs/intro', vote: 'up' }]);
	});

	it('names a page by one path, whatever the trailing slash setting', () => {
		location.url = new URL('http://localhost/docs/intro/?tab=npm#install');
		report({ type: 'copy_code', language: 'ts', source: 'fence' });
		location.url = new URL('http://localhost/');
		report({ type: 'not_found', referrer: null });

		expect(events.map((event) => event.path)).toEqual(['/docs/intro', '/']);
	});

	it('does nothing without a handler', () => {
		reader.handler = undefined;
		expect(() => report({ type: 'feedback', vote: 'up' })).not.toThrow();
	});

	it('logs a handler that throws, and carries on', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		reader.handler = () => {
			throw new Error('provider not ready');
		};
		expect(() => report({ type: 'feedback', vote: 'down' })).not.toThrow();
		expect(error).toHaveBeenCalledWith(
			'[svelte-docsmith] the reader event handler threw on',
			'feedback',
			expect.any(Error)
		);
	});
});

describe('feedback events', () => {
	const recovery = {
		path: '/docs/intro',
		editHref: 'https://github.com/o/r/edit/main/intro.md',
		issueHref: 'https://github.com/o/r/issues/new'
	};

	it('reports a vote once, and still calls the deprecated callback', async () => {
		const onfeedback = vi.fn();
		render(PageFeedback, { props: { path: '/docs/intro', onfeedback } });
		await fireEvent.click(screen.getByRole('button', { name: /^Yes/ }));
		expect(events).toEqual([{ type: 'feedback', path: '/docs/intro', vote: 'up' }]);
		expect(onfeedback).toHaveBeenCalledWith('up', '/docs/intro');
	});

	it('reports each link followed after a "No" vote', async () => {
		render(PageFeedback, { props: recovery });
		await fireEvent.click(screen.getByRole('button', { name: /^No/ }));
		await fireEvent.click(screen.getByRole('link', { name: /Edit this page/ }));
		await fireEvent.click(screen.getByRole('link', { name: /Open an issue/ }));
		expect(events).toEqual([
			{ type: 'feedback', path: '/docs/intro', vote: 'down' },
			{ type: 'feedback_link', path: '/docs/intro', link: 'edit' },
			{ type: 'feedback_link', path: '/docs/intro', link: 'issue' }
		]);
	});
});

describe('page_action events', () => {
	async function openMenu() {
		await fireEvent.click(screen.getByRole('button', { name: 'More page actions' }));
		await screen.findByRole('menuitem', { name: 'Copy page' });
	}

	it('reports Copy page from the button and from the menu', async () => {
		render(CopyPageMenu, { props: { path: '/docs/intro', origin: 'https://x.dev' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy this page as Markdown' }));
		await openMenu();
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Copy page' }));
		expect(events).toEqual([
			{ type: 'page_action', path: '/docs/intro', action: 'copy_markdown' },
			{ type: 'page_action', path: '/docs/intro', action: 'copy_markdown' }
		]);
	});

	it.each([
		['View as Markdown', 'view_markdown'],
		['Open in ChatGPT', 'open_chatgpt'],
		['Open in Claude', 'open_claude']
	])('reports %s', async (name, action) => {
		render(CopyPageMenu, { props: { path: '/docs/intro', origin: 'https://x.dev' } });
		await openMenu();
		const item = screen.getByRole('menuitem', { name });
		// The item is a link to another tab; keep jsdom from trying to follow it.
		item.addEventListener('click', (event) => event.preventDefault());
		await fireEvent.click(item);
		expect(events).toEqual([{ type: 'page_action', path: '/docs/intro', action }]);
	});

	it('reports the MCP server URL and each editor setup copied', async () => {
		render(CopyPageMenu, {
			props: { path: '/docs/intro', origin: 'https://x.dev', title: 'Docs', mcp: '/mcp' }
		});
		await openMenu();
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Connect to your editor' }));
		const dialog = await screen.findByRole('dialog', { name: 'Connect to your editor' });
		await fireEvent.click(within(dialog).getByRole('button', { name: 'Copy server URL' }));
		await fireEvent.click(within(dialog).getByRole('button', { name: 'Copy Cursor setup' }));
		expect(events).toEqual([
			{ type: 'page_action', path: '/docs/intro', action: 'copy_mcp_url' },
			{ type: 'page_action', path: '/docs/intro', action: 'copy_mcp_setup', editor: 'Cursor' }
		]);
	});
});

describe('copy_code events', () => {
	// The copy buttons read the block's text with `innerText`, and the fence's
	// scroll area watches its size, neither of which jsdom has.
	beforeEach(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
		Object.defineProperty(HTMLElement.prototype, 'innerText', {
			configurable: true,
			get(this: HTMLElement) {
				return this.textContent ?? '';
			}
		});
	});
	afterEach(() => {
		delete (HTMLElement.prototype as { innerText?: string }).innerText;
	});

	const code = createRawSnippet(() => ({ render: () => '<code>const a = 1;</code>' }));

	it("reports a fence's language", async () => {
		render(Pre, { props: { language: 'ts', children: code } });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
		expect(events).toEqual([
			{ type: 'copy_code', path: '/docs/intro', language: 'ts', source: 'fence' }
		]);
	});

	it('reports a fence without a language as null, from its title bar too', async () => {
		render(Pre, { props: { title: 'notes.txt', children: code } });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
		expect(events).toEqual([
			{ type: 'copy_code', path: '/docs/intro', language: null, source: 'fence' }
		]);
	});

	it("reports a live example's source", async () => {
		const children = createRawSnippet(() => ({ render: () => '<span>example</span>' }));
		render(LiveExample, { props: { source: '<pre><code>x</code></pre>', children } });
		await fireEvent.click(screen.getByRole('button', { name: /Show source/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
		expect(events).toEqual([
			{ type: 'copy_code', path: '/docs/intro', language: 'svelte', source: 'live_example' }
		]);
	});
});
