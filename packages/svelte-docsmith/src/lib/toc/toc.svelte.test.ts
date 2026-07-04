import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactiveToc } from './toc.svelte.js';
import type { TocItem } from './types.js';

vi.mock('esm-env', async (importOriginal) => ({
	...(await importOriginal<typeof import('esm-env')>()),
	BROWSER: true
}));

// Fake IntersectionObserver whose entries we drive from the test.
class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	observed = new Set<Element>();
	constructor(cb: IntersectionObserverCallback) {
		this.callback = cb;
		FakeIntersectionObserver.instances.push(this);
	}
	observe(el: Element) {
		this.observed.add(el);
	}
	unobserve(el: Element) {
		this.observed.delete(el);
	}
	disconnect() {
		this.observed.clear();
	}
	takeRecords() {
		return [];
	}
	trigger(entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) {
		this.callback(entries as unknown as IntersectionObserverEntry[], this as never);
	}
}

const latest = () => FakeIntersectionObserver.instances.at(-1)!;

/** A rendered doc: nested <section data-section-id> mirroring the TocItem tree. */
function renderDoc(): { root: HTMLElement; a: HTMLElement; a1: HTMLElement } {
	const root = document.createElement('div');
	const a = document.createElement('section');
	a.setAttribute('data-section-id', 'a');
	const a1 = document.createElement('section');
	a1.setAttribute('data-section-id', 'a-1');
	a.append(a1);
	root.append(a);
	document.body.append(root);
	return { root, a, a1 };
}

const TREE: TocItem[] = [
	{ title: 'A', url: '#a', items: [{ title: 'A1', url: '#a-1', items: [] }] }
];

beforeEach(() => {
	vi.useFakeTimers();
	FakeIntersectionObserver.instances = [];
	vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('reactiveToc', () => {
	it('maps a visible section onto its TocItem as highlighted/focused', () => {
		const { a } = renderDoc();
		let toc!: { items: import('./types.js').HighlightedTocItem[] };
		$effect.root(() => {
			toc = reactiveToc(
				() => TREE,
				() => a.parentElement
			);
		});
		flushSync();

		latest().trigger([{ target: a, isIntersecting: true, intersectionRatio: 0.9 }]);
		flushSync();

		expect(toc.items[0].isHighlighted).toBe(true);
		expect(toc.items[0].isFocused).toBe(true);
	});

	it('propagates a visible child up to the parent as hasVisibleChildren', () => {
		const { root, a1 } = renderDoc();
		let toc!: { items: import('./types.js').HighlightedTocItem[] };
		$effect.root(() => {
			toc = reactiveToc(
				() => TREE,
				() => root
			);
		});
		flushSync();

		latest().trigger([{ target: a1, isIntersecting: true, intersectionRatio: 0.9 }]);
		flushSync();

		const parent = toc.items[0];
		expect(parent.items[0].isHighlighted).toBe(true);
		expect(parent.hasVisibleChildren).toBe(true);
		expect(parent.hasFocusedChildren).toBe(true);
	});

	it('leaves every item unhighlighted when nothing is visible', () => {
		const { root } = renderDoc();
		let toc!: { items: import('./types.js').HighlightedTocItem[] };
		$effect.root(() => {
			toc = reactiveToc(
				() => TREE,
				() => root
			);
		});
		flushSync();

		expect(toc.items[0].isHighlighted).toBe(false);
		expect(toc.items[0].items[0].isHighlighted).toBe(false);
	});
});
