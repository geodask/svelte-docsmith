import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The scroll-spy effect is browser-gated; force the browser branch under jsdom.
vi.mock('esm-env', () => ({ BROWSER: true }));

import { createToc } from './toc.svelte.js';

type Entry = { isIntersecting: boolean; target: Element };

// Capture the observers createToc builds so a test can drive intersections.
let observers: Array<{
	cb: (entries: Entry[]) => void;
	observed: Element[];
	disconnected: boolean;
}>;

class MockIntersectionObserver {
	private record;
	constructor(cb: (entries: Entry[]) => void) {
		this.record = { cb, observed: [] as Element[], disconnected: false };
		observers.push(this.record);
	}
	observe(el: Element) {
		this.record.observed.push(el);
	}
	unobserve() {}
	disconnect() {
		this.record.disconnected = true;
	}
	takeRecords() {
		return [];
	}
}

beforeEach(() => {
	observers = [];
	vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	document.body.innerHTML = `
		<main id="content">
			<h2 id="intro">Intro</h2>
			<h3 id="setup">Setup</h3>
			<h2 id="usage">Usage</h2>
		</main>`;
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

function content() {
	return document.getElementById('content');
}

describe('createToc', () => {
	it('refresh() scans h2/h3 headings from the content element', async () => {
		let toc!: ReturnType<typeof createToc>;
		const dispose = $effect.root(() => {
			toc = createToc(content);
		});

		await toc.refresh();
		flushSync();

		expect(toc.items).toEqual([
			{ id: 'intro', title: 'Intro', depth: 2 },
			{ id: 'setup', title: 'Setup', depth: 3 },
			{ id: 'usage', title: 'Usage', depth: 2 }
		]);
		dispose();
	});

	it('defaults the active id to the first heading, then follows the visible one', async () => {
		let toc!: ReturnType<typeof createToc>;
		const dispose = $effect.root(() => {
			toc = createToc(content);
		});

		await toc.refresh();
		flushSync();

		const observer = observers.at(-1)!;
		// The real IntersectionObserver fires an initial callback; with nothing in
		// the band that defaults the active id to the first heading.
		observer.cb([{ isIntersecting: false, target: content()!.querySelector('#intro')! }]);
		flushSync();
		expect(toc.activeId).toBe('intro');

		observer.cb([{ isIntersecting: true, target: content()!.querySelector('#usage')! }]);
		flushSync();
		expect(toc.activeId).toBe('usage');

		// Earlier heading also enters the band → the first in document order wins.
		observer.cb([{ isIntersecting: true, target: content()!.querySelector('#setup')! }]);
		flushSync();
		expect(toc.activeId).toBe('setup');
		dispose();
	});

	it('reports an empty list and null active id when there is no content element', async () => {
		let toc!: ReturnType<typeof createToc>;
		const dispose = $effect.root(() => {
			toc = createToc(() => null);
		});

		await toc.refresh();
		flushSync();

		expect(toc.items).toEqual([]);
		expect(toc.activeId).toBeNull();
		dispose();
	});

	it('disconnects the observer when the scope is disposed', async () => {
		let toc!: ReturnType<typeof createToc>;
		const dispose = $effect.root(() => {
			toc = createToc(content);
		});
		await toc.refresh();
		flushSync();

		const observer = observers.at(-1)!;
		expect(observer.disconnected).toBe(false);
		dispose();
		expect(observer.disconnected).toBe(true);
	});
});
