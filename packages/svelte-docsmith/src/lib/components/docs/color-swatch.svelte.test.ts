import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ColorSwatch, { variableName } from './color-swatch.svelte';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * jsdom doesn't substitute var() in computed custom properties, so the test
 * stands in for the browser: `--docsmith-swatch` resolves to `colours[mode]`,
 * and `color` to `painted`. Dark is docsmith's `.dark` or a `data-theme`.
 */
function resolveTo(colours: { light: string; dark: string }, painted = '') {
	const real = window.getComputedStyle;
	vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
		const style = real(element);
		const root = document.documentElement;
		const dark = root.classList.contains('dark') || root.dataset.theme === 'dark';
		return new Proxy(style, {
			get(target, key) {
				if (key === 'getPropertyValue') {
					return (name: string) =>
						name === '--docsmith-swatch'
							? dark
								? colours.dark
								: colours.light
							: target.getPropertyValue(name);
				}
				if (key === 'color') return painted;
				const value = Reflect.get(target, key);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	document.documentElement.classList.remove('dark');
	delete document.documentElement.dataset.theme;
});

describe('variableName', () => {
	it('reads the variable from a lone var()', () => {
		expect(variableName('var(--brand)')).toBe('--brand');
		expect(variableName(' var( --brand-500 , #000 ) ')).toBe('--brand-500');
		expect(variableName('#3b82f6')).toBeUndefined();
		expect(variableName('color-mix(in oklch, var(--a), white)')).toBeUndefined();
	});

	it('takes a fallback with brackets of its own', () => {
		expect(variableName('var(--brand, oklch(0.5 0.1 200))')).toBe('--brand');
		expect(variableName('var(--a, var(--b, rgb(0 0 0)))')).toBe('--a');
	});

	it('is not fooled by two values that happen to start and end with var()', () => {
		expect(variableName('var(--a) var(--b)')).toBeUndefined();
		expect(variableName('var(--a, rgb(0 0 0)) x)')).toBeUndefined();
		expect(variableName('var(--a, rgb(0 0 0)')).toBeUndefined();
	});
});

describe('ColorSwatch', () => {
	it('paints the colour and names it by its value', () => {
		const { container } = render(ColorSwatch, { props: { value: '#3b82f6' } });
		const colour = container.querySelector<HTMLElement>('.docsmith-swatch-colour')!;
		expect(colour.style.getPropertyValue('--docsmith-swatch')).toBe('#3b82f6');
		expect(screen.getByText('#3b82f6')).toBeInTheDocument();
		// The value would only repeat the name.
		expect(container.querySelector('code')).toBeNull();
	});

	it('shows what a variable resolves to, and follows the colour mode', async () => {
		resolveTo({ light: 'oklch(0.55 0.2 260)', dark: 'oklch(0.75 0.15 260)' });
		const { container } = render(ColorSwatch, { props: { value: 'var(--primary)' } });
		expect(screen.getByText('--primary')).toBeInTheDocument();
		expect(container.querySelector('code')).toHaveTextContent('oklch(0.55 0.2 260)');

		document.documentElement.classList.add('dark');
		await settle();
		expect(container.querySelector('code')).toHaveTextContent('oklch(0.75 0.15 260)');
	});

	it('keeps the value as written when the browser resolves nothing', () => {
		resolveTo({ light: '', dark: '' });
		const { container } = render(ColorSwatch, {
			props: { value: 'var(--missing)', name: 'Brand' }
		});
		expect(screen.getByText('Brand')).toBeInTheDocument();
		expect(container.querySelector('code')).toHaveTextContent('var(--missing)');
	});

	it('follows a colour mode set by any attribute on the root element', async () => {
		resolveTo({ light: '#ffffff', dark: '#000000' });
		const { container } = render(ColorSwatch, { props: { value: 'var(--background)' } });
		expect(container.querySelector('code')).toHaveTextContent('#ffffff');

		document.documentElement.dataset.theme = 'dark';
		await settle();
		expect(container.querySelector('code')).toHaveTextContent('#000000');
	});

	it('shows a derived colour as the colour it paints', () => {
		resolveTo(
			{ light: 'color-mix(in oklch, oklch(0.6 0.2 260) 80%, oklch(0.1 0 0))', dark: '' },
			'oklch(0.5 0.16 260)'
		);
		const { container } = render(ColorSwatch, { props: { value: 'var(--accent-strong)' } });
		expect(container.querySelector('code')).toHaveTextContent('oklch(0.5 0.16 260)');
	});

	it('resolves again when the value changes', async () => {
		resolveTo({ light: 'oklch(0.55 0.2 260)', dark: '' });
		const { container, rerender } = render(ColorSwatch, {
			props: { value: 'var(--primary)' }
		});
		expect(container.querySelector('code')).toHaveTextContent('oklch(0.55 0.2 260)');

		vi.restoreAllMocks();
		resolveTo({ light: '#ff0000', dark: '' });
		await rerender({ value: 'var(--destructive)' });
		await settle();
		expect(screen.getByText('--destructive')).toBeInTheDocument();
		expect(container.querySelector('code')).toHaveTextContent('#ff0000');
	});
});
