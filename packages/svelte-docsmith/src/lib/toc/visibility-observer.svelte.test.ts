import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { visibilityObserver, type ElementObserver } from './visibility-observer.svelte.js';

// The observer only runs its real logic in the browser; keep the rest of
// esm-env intact (Svelte internals read DEV from it).
vi.mock('esm-env', async (importOriginal) => ({
	...(await importOriginal<typeof import('esm-env')>()),
	BROWSER: true
}));

// jsdom has no IntersectionObserver; this fake lets tests drive intersections.
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
	/** Drive an intersection change for elements this observer is watching. */
	trigger(entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) {
		this.callback(entries as unknown as IntersectionObserverEntry[], this as never);
	}
}

const latest = () => FakeIntersectionObserver.instances.at(-1)!;

function section(id: string, rank?: string): HTMLElement {
	const el = document.createElement('section');
	el.setAttribute('data-section-id', id);
	if (rank) el.setAttribute('data-heading-rank', rank);
	return el;
}

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

const OPTS = { idAttribute: 'data-section-id' };

describe('visibilityObserver', () => {
	it('registers every [data-section-id] element under the root', () => {
		const root = document.createElement('div');
		root.append(section('a'), section('b'));
		document.body.append(root);

		let observer!: ElementObserver;
		$effect.root(() => {
			observer = visibilityObserver(() => root, OPTS);
		});
		flushSync();

		expect(observer.elements.map((e) => e.id)).toEqual(['a', 'b']);
		expect(observer.elements.every((e) => !e.isVisible)).toBe(true);
		expect(latest().observed.size).toBe(2);
	});

	it('marks an element visible when it intersects', () => {
		const root = document.createElement('div');
		const a = section('a');
		root.append(a);
		document.body.append(root);

		let observer!: ElementObserver;
		$effect.root(() => {
			observer = visibilityObserver(() => root, OPTS);
		});
		flushSync();

		latest().trigger([{ target: a, isIntersecting: true, intersectionRatio: 0.5 }]);
		flushSync();

		expect(observer.elements.find((e) => e.id === 'a')?.isVisible).toBe(true);
	});

	it('gives isActive to the visible element with the highest intersection ratio', () => {
		const root = document.createElement('div');
		const a = section('a');
		const b = section('b');
		root.append(a, b);
		document.body.append(root);

		let observer!: ElementObserver;
		$effect.root(() => {
			observer = visibilityObserver(() => root, OPTS);
		});
		flushSync();

		latest().trigger([
			{ target: a, isIntersecting: true, intersectionRatio: 0.3 },
			{ target: b, isIntersecting: true, intersectionRatio: 0.8 }
		]);
		flushSync();

		expect(observer.elements.find((e) => e.id === 'b')?.isActive).toBe(true);
		expect(observer.elements.find((e) => e.id === 'a')?.isActive).toBe(false);
	});

	it('flags parents of visible/active children', () => {
		const root = document.createElement('div');
		const parent = section('parent');
		const child = section('child');
		parent.append(child);
		root.append(parent);
		document.body.append(root);

		let observer!: ElementObserver;
		$effect.root(() => {
			observer = visibilityObserver(() => root, OPTS);
		});
		flushSync();

		latest().trigger([{ target: child, isIntersecting: true, intersectionRatio: 0.9 }]);
		flushSync();

		const p = observer.elements.find((e) => e.id === 'parent')!;
		expect(p.isVisible).toBe(false);
		expect(p.hasVisibleChildren).toBe(true);
		expect(p.hasFocusedChildren).toBe(true);
	});

	it('excludes elements rejected by the filter', () => {
		const root = document.createElement('div');
		root.append(section('keep'), section('drop', '1'));
		document.body.append(root);

		let observer!: ElementObserver;
		$effect.root(() => {
			observer = visibilityObserver(() => root, {
				...OPTS,
				filter: (el) => el.getAttribute('data-heading-rank') !== '1'
			});
		});
		flushSync();

		expect(observer.elements.map((e) => e.id)).toEqual(['keep']);
	});

	it('re-observes when the root element changes', () => {
		const root1 = document.createElement('div');
		root1.append(section('a'));
		const root2 = document.createElement('div');
		root2.append(section('x'), section('y'));
		document.body.append(root1, root2);

		let observer!: ElementObserver;
		let setRoot!: (el: HTMLElement) => void;
		$effect.root(() => {
			let current = $state<HTMLElement>(root1);
			setRoot = (el) => (current = el);
			observer = visibilityObserver(() => current, OPTS);
		});
		flushSync();
		expect(observer.elements.map((e) => e.id)).toEqual(['a']);

		setRoot(root2);
		flushSync();
		expect(observer.elements.map((e) => e.id)).toEqual(['x', 'y']);
	});
});
