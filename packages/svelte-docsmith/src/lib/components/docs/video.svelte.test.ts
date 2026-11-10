import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Video, { youtubeVideo } from './video.svelte';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let reducedMotion = false;
let play: ReturnType<typeof vi.fn<(this: HTMLVideoElement) => Promise<void>>>;

beforeEach(() => {
	reducedMotion = false;
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce') && reducedMotion,
		media: query
	}));
	// jsdom plays nothing: playing just flips `paused` and says so.
	play = vi.fn(function (this: HTMLVideoElement): Promise<void> {
		Object.defineProperty(this, 'paused', { configurable: true, value: false });
		this.dispatchEvent(new Event('play'));
		return Promise.resolve();
	});
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
	vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
		this: HTMLVideoElement
	) {
		Object.defineProperty(this, 'paused', { configurable: true, value: true });
		this.dispatchEvent(new Event('pause'));
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('youtubeVideo', () => {
	it('reads watch, short, Shorts and embed links', () => {
		expect(youtubeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
			id: 'dQw4w9WgXcQ',
			short: false
		});
		expect(youtubeVideo('https://youtu.be/dQw4w9WgXcQ?t=90')).toEqual({
			id: 'dQw4w9WgXcQ',
			short: false,
			start: 90
		});
		expect(youtubeVideo('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')?.start).toBe(90);
		expect(youtubeVideo('https://youtube.com/shorts/dQw4w9WgXcQ')?.short).toBe(true);
		expect(youtubeVideo('https://www.youtube.com/embed/dQw4w9WgXcQ?start=5')?.start).toBe(5);
		expect(youtubeVideo('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')?.id).toBe(
			'dQw4w9WgXcQ'
		);
		expect(youtubeVideo('https://www.youtube.com/live/dQw4w9WgXcQ')?.id).toBe('dQw4w9WgXcQ');
	});

	it('treats anything else as a file', () => {
		expect(youtubeVideo('/demo.mp4')).toBeUndefined();
		expect(youtubeVideo('./demo.mp4')).toBeUndefined();
		expect(youtubeVideo('https://cdn.example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
		expect(youtubeVideo('https://www.youtube.com/@svelte')).toBeUndefined();
		expect(youtubeVideo('https://www.youtube.com/watch?v=short')).toBeUndefined();
	});
});

describe('Video from a file', () => {
	it('plays with native controls, the poster and a captions track', () => {
		const { container } = render(Video, {
			props: { src: '/demo.mp4', title: 'Demo', poster: '/demo.jpg', captions: '/demo.vtt' }
		});
		const video = container.querySelector('video')!;
		expect(video).toHaveAttribute('src', '/demo.mp4');
		expect(video).toHaveAttribute('poster', '/demo.jpg');
		expect(video.controls).toBe(true);
		expect(video).toHaveAttribute('aria-label', 'Demo');
		const track = video.querySelector('track')!;
		expect(track).toHaveAttribute('kind', 'captions');
		expect(track).toHaveAttribute('src', '/demo.vtt');
		expect(track).toHaveAttribute('srclang', 'en');
		expect(play).not.toHaveBeenCalled();
	});

	it('loops muted with no controls, and can be paused', async () => {
		const { container } = render(Video, {
			props: { src: '/clip.mp4', title: 'Clip', captions: '/clip.vtt', loop: true }
		});
		await settle();
		const video = container.querySelector('video')!;
		expect(video.controls).toBe(false);
		expect(video.loop).toBe(true);
		expect(video.muted).toBe(true);
		expect(play).toHaveBeenCalledOnce();
		// With no controls to turn them on, the captions are on from the start.
		expect(video.querySelector('track')).toHaveAttribute('default');

		// One button that changes, so focus stays on it.
		const button = screen.getByRole('button', { name: 'Pause video: Clip' });
		button.focus();
		await fireEvent.click(button);
		expect(button).toHaveAccessibleName('Play video: Clip');
		expect(document.activeElement).toBe(button);
		await fireEvent.click(button);
		expect(button).toHaveAccessibleName('Pause video: Clip');
	});

	it('holds a loop on its poster under reduced motion until play is pressed', async () => {
		reducedMotion = true;
		render(Video, { props: { src: '/clip.mp4', title: 'Clip', poster: '/clip.jpg', loop: true } });
		await settle();
		expect(play).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Play video: Clip' }));
		expect(play).toHaveBeenCalledOnce();
	});
});

describe('Video from YouTube', () => {
	it('shows the thumbnail and loads nothing from the player until play', async () => {
		const { container } = render(Video, {
			props: { src: 'https://youtu.be/dQw4w9WgXcQ?t=30', title: 'Talk' }
		});
		expect(container.querySelector('iframe')).toBeNull();
		expect(container.querySelector('img')).toHaveAttribute(
			'src',
			'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'Play video: Talk' }));
		const frame = container.querySelector('iframe')!;
		expect(frame).toHaveAttribute(
			'src',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&start=30'
		);
		expect(frame).toHaveAttribute('title', 'Talk');
		// The play button is gone: focus moves into the player, not the page.
		expect(document.activeElement).toBe(frame);
	});

	it('warns in development about a YouTube link that names no video', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(Video, { props: { src: 'https://www.youtube.com/@sveltesociety', title: 'Channel' } });
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('names no video'));
	});

	it('uses the poster over the thumbnail', () => {
		const { container } = render(Video, {
			props: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Talk', poster: '/a.jpg' }
		});
		expect(container.querySelector('img')).toHaveAttribute('src', '/a.jpg');
	});
});
