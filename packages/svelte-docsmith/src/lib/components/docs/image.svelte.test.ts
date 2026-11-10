import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Image from './image.svelte';
import MarkdownImage from '../markdown/img.svelte';

// jsdom lays nothing out, so each test says how big the picture is drawn and
// how big it really is. The observer reports once, as a browser would on load.
vi.stubGlobal(
	'ResizeObserver',
	class {
		constructor(private callback: () => void) {}
		observe() {
			queueMicrotask(this.callback);
		}
		disconnect() {}
	}
);

function drawn({ natural, shown }: { natural: number; shown: number }) {
	const proto = HTMLImageElement.prototype;
	vi.spyOn(proto, 'complete', 'get').mockReturnValue(true);
	vi.spyOn(proto, 'naturalWidth', 'get').mockReturnValue(natural);
	vi.spyOn(proto, 'naturalHeight', 'get').mockReturnValue(natural / 2);
	Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => shown });
	Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => shown / 2 });
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => drawn({ natural: 800, shown: 800 }));
afterEach(() => vi.restoreAllMocks());

describe('Image', () => {
	it('draws a figure with its caption', () => {
		const { container } = render(Image, {
			props: { src: '/chart.png', alt: 'Sales chart', caption: 'Sales by month' }
		});
		expect(container.querySelector('figure')).not.toBeNull();
		expect(screen.getByRole('img', { name: 'Sales chart' })).toHaveAttribute('src', '/chart.png');
		expect(screen.getByText('Sales by month').tagName).toBe('FIGCAPTION');
	});

	it('offers no zoom for a picture shown at its real size', async () => {
		render(Image, { props: { src: '/chart.png', alt: 'Sales chart' } });
		await settle();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('zooms a picture shown smaller than its real size, in a dialog', async () => {
		drawn({ natural: 1600, shown: 640 });
		render(Image, { props: { src: '/chart.png', alt: 'Sales chart' } });
		await settle();
		await fireEvent.click(screen.getByRole('button', { name: 'Zoom image: Sales chart' }));
		const dialog = await screen.findByRole('dialog');
		expect(dialog.querySelector('img')).toHaveAttribute('src', '/chart.png');
	});

	it('draws one picture per colour mode, the dark one hidden until dark mode', () => {
		const { container } = render(Image, {
			props: { src: '/light.png', dark: '/dark.png', alt: 'Diagram' }
		});
		const [light, dark] = container.querySelectorAll('img');
		expect(light).toHaveClass('dark:hidden');
		expect(dark).toHaveAttribute('src', '/dark.png');
		expect(dark).toHaveClass('hidden', 'dark:inline');
	});
});

describe('markdown images', () => {
	it('draws a standalone image as a figure, its title the caption', () => {
		const { container } = render(MarkdownImage, {
			props: { src: '/a.png', alt: 'A', title: 'The caption', standalone: true }
		});
		expect(container.querySelector('figcaption')).toHaveTextContent('The caption');
	});

	it('keeps an image inside a sentence inline, its title a hover hint', () => {
		const { container } = render(MarkdownImage, {
			props: { src: '/a.png', alt: 'A', title: 'Hint' }
		});
		expect(container.querySelector('figure')).toBeNull();
		expect(container.querySelector('img')).toHaveAttribute('title', 'Hint');
	});
});
