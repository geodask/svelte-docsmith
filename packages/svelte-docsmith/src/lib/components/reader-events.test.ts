import { describe, expect, it, vi } from 'vitest';

const handler = vi.hoisted(() => vi.fn());
vi.mock('svelte-docsmith/reader-events', () => ({ handler }));

import { report } from './reader-events.js';

// The server project runs without the browser condition, as SSR and prerender do.
describe('report during SSR', () => {
	it('never calls the handler', () => {
		report({ type: 'not_found', path: '/docs/missing', referrer: null });
		expect(handler).not.toHaveBeenCalled();
	});
});
