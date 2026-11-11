import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Columns from './columns.svelte';

const body = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('Columns', () => {
	it('lays out its children in two columns by default', () => {
		const { container } = render(Columns, {
			props: { children: body('<div><p>One</p><p>Two</p></div>') }
		});
		const grid = container.querySelector('.docsmith-columns')!;
		expect(grid).not.toHaveClass('docsmith-columns-3');
		expect(grid.children).toHaveLength(1);
		expect(grid.textContent).toContain('One');
	});

	it('takes three columns', () => {
		const { container } = render(Columns, {
			props: { cols: 3, children: body('<div>x</div>') }
		});
		expect(container.querySelector('.docsmith-columns')).toHaveClass('docsmith-columns-3');
	});
});
