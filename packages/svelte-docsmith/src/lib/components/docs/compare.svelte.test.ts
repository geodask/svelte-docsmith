import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Compare from './compare.svelte';

const live = (html: string) => createRawSnippet(() => ({ render: () => html }));
const slider = () => screen.getByRole('slider');

afterEach(() => vi.restoreAllMocks());

describe('Compare', () => {
	it('shows two pictures with their alt text, split in the middle', () => {
		const { container } = render(Compare, {
			props: { before: '/old.png', after: '/new.png', beforeAlt: 'Old', afterAlt: 'New' }
		});
		expect(screen.getByAltText('Old')).toHaveAttribute('src', '/old.png');
		expect(screen.getByAltText('New')).toHaveAttribute('src', '/new.png');
		expect(container.querySelector('.docsmith-compare')).toHaveStyle('--split: 50%');
	});

	it('names the divider by its sides and says how far it is', () => {
		render(Compare, {
			props: {
				before: '/a.png',
				after: '/b.png',
				beforeLabel: 'v1',
				afterLabel: 'v2',
				position: 30
			}
		});
		expect(slider()).toHaveAccessibleName('v1 and v2 divider');
		expect(slider()).toHaveAttribute('aria-valuenow', '30');
		expect(slider()).toHaveAttribute('aria-valuetext', '30% v1');
	});

	it('moves with the arrow keys, further with Shift, and to either end', async () => {
		render(Compare, { props: { before: '/a.png', after: '/b.png' } });
		await fireEvent.keyDown(slider(), { key: 'ArrowRight' });
		expect(slider()).toHaveAttribute('aria-valuenow', '52');
		await fireEvent.keyDown(slider(), { key: 'ArrowLeft', shiftKey: true });
		expect(slider()).toHaveAttribute('aria-valuenow', '42');
		await fireEvent.keyDown(slider(), { key: 'End' });
		expect(slider()).toHaveAttribute('aria-valuenow', '100');
		await fireEvent.keyDown(slider(), { key: 'ArrowRight' });
		expect(slider()).toHaveAttribute('aria-valuenow', '100');
		await fireEvent.keyDown(slider(), { key: 'Home' });
		expect(slider()).toHaveAttribute('aria-valuenow', '0');
	});

	it('keeps a start position inside the frame', () => {
		render(Compare, { props: { before: '/a.png', after: '/b.png', position: 140 } });
		expect(slider()).toHaveAttribute('aria-valuenow', '100');
	});

	it('follows the pointer while dragged', async () => {
		const { container } = render(Compare, { props: { before: '/a.png', after: '/b.png' } });
		const frame = container.querySelector<HTMLElement>('.compare-frame')!;
		vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 400, 300));
		await fireEvent.pointerDown(frame, { button: 0, clientX: 200, pointerId: 1 });
		expect(slider()).toHaveAttribute('aria-valuenow', '25');
		await fireEvent.pointerMove(frame, { clientX: 400, pointerId: 1 });
		expect(slider()).toHaveAttribute('aria-valuenow', '75');
		await fireEvent.pointerUp(frame, { pointerId: 1 });
		await fireEvent.pointerMove(frame, { clientX: 150, pointerId: 1 });
		expect(slider()).toHaveAttribute('aria-valuenow', '75');
	});

	it('renders live content, which keeps its clicks: only the handle drags', async () => {
		const { container } = render(Compare, {
			props: { before: live('<button>Old</button>'), after: live('<button>New</button>') }
		});
		expect(screen.getByRole('button', { name: 'Old' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
		const frame = container.querySelector<HTMLElement>('.compare-frame')!;
		vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 300));
		await fireEvent.pointerDown(frame, { button: 0, clientX: 100, pointerId: 1 });
		expect(slider()).toHaveAttribute('aria-valuenow', '50');
		await fireEvent.pointerDown(slider(), { button: 0, clientX: 100, pointerId: 1 });
		expect(slider()).toHaveAttribute('aria-valuenow', '25');
	});
});
