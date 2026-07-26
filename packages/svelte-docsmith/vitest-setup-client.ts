import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// jsdom implements neither of these; bits-ui scrolls the highlighted command
// item into view on arrow-key navigation, so a no-op keeps keyboard flows quiet.
if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}

// jsdom has no Web Animations API, but Svelte 5 transitions call
// `element.animate`. A stub that resolves immediately lets components that use
// `svelte/transition` (e.g. the copy button's icon fade) mount without throwing;
// tests assert final state, not the tween.
if (!Element.prototype.animate) {
	Element.prototype.animate = () =>
		({
			cancel() {},
			play() {},
			pause() {},
			finish() {},
			commitStyles() {},
			finished: Promise.resolve(),
			onfinish: null,
			oncancel: null,
			currentTime: 0,
			playState: 'finished',
			effect: { getComputedTiming: () => ({ duration: 0 }) },
			addEventListener() {},
			removeEventListener() {}
		}) as unknown as Animation;
}

// add more mocks here if you need them
