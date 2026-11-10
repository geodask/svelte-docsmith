import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Columns from './columns.svelte';
import Do from './do.svelte';
import Dont from './dont.svelte';

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

describe('Do and Dont', () => {
	it('label each panel in words, not only colour', () => {
		const good = render(Do, { props: { children: body('<p>Use one verb.</p>') } });
		expect(good.container.querySelector('.docsmith-guideline-do')).not.toBeNull();
		expect(good.getByText('Do')).toBeInTheDocument();
		expect(good.getByText('Use one verb.')).toBeInTheDocument();

		const bad = render(Dont, { props: { children: body('<p>Stack verbs.</p>') } });
		expect(bad.container.querySelector('.docsmith-guideline-dont')).not.toBeNull();
		expect(bad.getByText("Don't")).toBeInTheDocument();
	});

	it('take another label', () => {
		const { getByText } = render(Dont, { props: { label: 'Avoid', children: body('<p>x</p>') } });
		expect(getByText('Avoid')).toBeInTheDocument();
	});
});
