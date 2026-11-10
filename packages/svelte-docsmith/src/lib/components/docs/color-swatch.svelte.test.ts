import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ColorSwatch, { variableName } from './color-swatch.svelte';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * jsdom doesn't substitute var() in computed custom properties, so the test
 * stands in for the browser: `--docsmith-swatch` resolves to `colours[mode]`.
 */
function resolveTo(colours: { light: string; dark: string }) {
	const real = window.getComputedStyle;
	vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
		const style = real(element);
		const dark = document.documentElement.classList.contains('dark');
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
				const value = Reflect.get(target, key);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	document.documentElement.classList.remove('dark');
});

describe('variableName', () => {
	it('reads the variable from a lone var()', () => {
		expect(variableName('var(--brand)')).toBe('--brand');
		expect(variableName(' var( --brand-500 , #000 ) ')).toBe('--brand-500');
		expect(variableName('#3b82f6')).toBeUndefined();
		expect(variableName('color-mix(in oklch, var(--a), white)')).toBeUndefined();
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
});
