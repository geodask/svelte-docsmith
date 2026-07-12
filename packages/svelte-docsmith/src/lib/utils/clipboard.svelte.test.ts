import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClipboard } from './clipboard.svelte.js';

describe('useClipboard', () => {
	let writeText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('starts empty and un-copied', () => {
		const clip = useClipboard();
		expect(clip.currentText).toBe('');
		expect(clip.copied).toBe(false);
	});

	it('readText stores the node text, trimmed', () => {
		const clip = useClipboard();
		// The action only reads `innerText`; a stub avoids jsdom's missing innerText.
		clip.readText({ innerText: '  const a = 1;  ' } as unknown as HTMLElement);
		expect(clip.currentText).toBe('const a = 1;');
	});

	it('copy() writes the stored text and toggles `copied`, resetting after the timeout', async () => {
		const clip = useClipboard(1500);
		clip.readText({ innerText: 'hello' } as unknown as HTMLElement);

		clip.copy();
		expect(writeText).toHaveBeenCalledWith('hello');

		// Let the writeText promise's `.then` run before asserting the flag.
		await Promise.resolve();
		expect(clip.copied).toBe(true);

		vi.advanceTimersByTime(1500);
		expect(clip.copied).toBe(false);
	});

	it('copy() is a no-op when there is no text', () => {
		const clip = useClipboard();
		clip.copy();
		expect(writeText).not.toHaveBeenCalled();
		expect(clip.copied).toBe(false);
	});

	it('stays un-copied and warns when writeText rejects', async () => {
		writeText.mockRejectedValueOnce(new Error('denied'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const clip = useClipboard();
		clip.readText({ innerText: 'oops' } as unknown as HTMLElement);

		clip.copy();
		// Flush the rejected writeText promise and the catch handler.
		await Promise.resolve();
		await Promise.resolve();

		expect(clip.copied).toBe(false);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('copy to clipboard failed'),
			expect.any(Error)
		);
	});

	it('does not throw when navigator.clipboard is unavailable', async () => {
		Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const clip = useClipboard();
		clip.readText({ innerText: 'x' } as unknown as HTMLElement);

		expect(() => clip.copy()).not.toThrow();
		await Promise.resolve();
		expect(clip.copied).toBe(false);
		expect(warn).toHaveBeenCalled();
	});

	it('honours a custom reset timeout', async () => {
		const clip = useClipboard(500);
		clip.readText({ innerText: 'x' } as unknown as HTMLElement);

		clip.copy();
		await Promise.resolve();
		expect(clip.copied).toBe(true);

		vi.advanceTimersByTime(499);
		expect(clip.copied).toBe(true);
		vi.advanceTimersByTime(1);
		expect(clip.copied).toBe(false);
	});
});
