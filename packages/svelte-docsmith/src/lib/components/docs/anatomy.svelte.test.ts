import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import AnatomyBasic from './_fixtures/anatomy-basic.svelte';
import Part from './part.svelte';

vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);

// jsdom lays nothing out, so each part gets a box by name and the stage sits
// at the origin.
const BOXES: Record<string, DOMRect> = {
	root: new DOMRect(100, 20, 200, 100),
	trigger: new DOMRect(120, 40, 60, 24),
	icon: new DOMRect(190, 40, 16, 16),
	content: new DOMRect(120, 80, 120, 30)
};

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const labels = (container: HTMLElement) =>
	[...container.querySelectorAll<HTMLElement>('.anatomy-label')].map((label) => ({
		number: label.textContent,
		left: label.style.left,
		top: label.style.top
	}));

let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		return BOXES[this.dataset.part ?? ''] ?? new DOMRect(0, 0, 400, 300);
	});
});
afterEach(() => vi.restoreAllMocks());

describe('Anatomy', () => {
	it('numbers the parts in the order they are written, and lists them', () => {
		render(AnatomyBasic);
		const items = screen.getAllByRole('listitem');
		expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'1 trigger The button.',
			'2 root The outer box.',
			'3 content What opens.'
		]);
	});

	it('labels each part on the live component where it is', async () => {
		const { container } = render(AnatomyBasic);
		await frame();
		// Each label sits on its part's top-left corner. The trigger's would sit
		// on the root's, so it moves along. The undescribed `icon` is still
		// labelled, numbered after the Parts.
		expect(labels(container)).toEqual([
			{ number: '2', left: '100px', top: '20px' },
			{ number: '1', left: '144px', top: '40px' },
			{ number: '4', left: '190px', top: '40px' }
		]);
		expect(container.querySelector('.anatomy-overlay')).toHaveAttribute('aria-hidden', 'true');
	});

	it('warns in dev about a data-part with no Part, and a Part with no data-part', async () => {
		render(AnatomyBasic);
		await frame();
		const messages = warn.mock.calls.map(([message]) => String(message));
		expect(messages).toContainEqual(expect.stringContaining('data-part="icon" has no <Part'));
		expect(messages).toContainEqual(expect.stringContaining('<Part name="content"> matches no'));
	});

	it('follows the component as its state changes', async () => {
		const { container, rerender } = render(AnatomyBasic);
		await frame();
		expect(labels(container).map((label) => label.number)).not.toContain('3');
		await rerender({ open: true });
		await frame();
		expect(labels(container)).toContainEqual({ number: '3', left: '120px', top: '80px' });
	});

	it('leaves the component working under its labels', async () => {
		render(AnatomyBasic);
		await frame();
		await fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('status')).toHaveTextContent('1');
	});

	it('hides and shows the labels', async () => {
		const { container } = render(AnatomyBasic);
		await frame();
		const toggle = screen.getByRole('button', { name: 'Hide labels' });
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(container.querySelector('.anatomy-overlay')).toBeNull();
		await fireEvent.click(toggle);
		flushSync();
		expect(labels(container)).toHaveLength(3);
	});

	it('lights up a part on the component when the reader points at it in the list', async () => {
		const { container } = render(AnatomyBasic);
		await frame();
		await fireEvent.pointerEnter(screen.getAllByRole('listitem')[0]);
		const active = container.querySelector('.anatomy-label.anatomy-active');
		expect(active).toHaveTextContent('1');
		await fireEvent.pointerLeave(screen.getAllByRole('listitem')[0]);
		expect(container.querySelector('.anatomy-label.anatomy-active')).toBeNull();
	});
});

describe('Part', () => {
	it('warns in dev outside an Anatomy', () => {
		render(Part, { props: { name: 'stray' } });
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('<Part name="stray"> belongs'));
	});
});
