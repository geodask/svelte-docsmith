import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import PropsTable from './props-table.svelte';
import type { ExtractedProps } from '../../core/extracted-props.js';

const extracted: ExtractedProps = {
	name: 'Select',
	typeParameters: ['T'],
	props: [
		{
			name: 'variant',
			type: "'a' | 'b'",
			default: "'a'",
			required: false,
			bindable: false,
			description: 'Visual <code>intent</code>.'
		},
		{ name: 'options', type: 'T[]', required: true, bindable: false },
		{ name: 'value', type: 'T', required: false, bindable: true },
		{
			name: 'old',
			type: 'string',
			required: false,
			bindable: false,
			deprecated: 'Use <code>value</code>.'
		}
	],
	inherited: [
		{ kind: 'element', label: 'a' },
		{ kind: 'type', label: 'ButtonProps' }
	]
};

describe('PropsTable', () => {
	it('renders hand-written rows', () => {
		const children = createRawSnippet(() => ({ render: () => '<div>hand-written row</div>' }));
		render(PropsTable, { props: { title: 'Badge', children } });
		expect(screen.getByText('Badge')).toBeInTheDocument();
		expect(screen.getByText('hand-written row')).toBeInTheDocument();
	});

	it('renders a generated table from a props import', () => {
		const { container } = render(PropsTable, { props: { of: extracted } });

		// The caption defaults to the component name, with its type parameters.
		expect(screen.getByText('Select<T>')).toBeInTheDocument();
		const names = [...container.querySelectorAll('.prop-name')].map((n) => n.textContent);
		expect(names).toEqual(['variant', 'options', 'value', 'old']);

		// Union members become chips; the description is rendered HTML.
		expect(screen.getByText("'a'", { selector: '.type-chip' })).toBeInTheDocument();
		expect(screen.getByText('intent').tagName).toBe('CODE');
		expect(screen.getByText('required')).toBeInTheDocument();
		expect(screen.getByText('bindable')).toBeInTheDocument();
		expect(screen.getByText('deprecated')).toBeInTheDocument();
		expect(screen.getByText(/Deprecated:/).querySelector('code')?.textContent).toBe('value');

		const inherited = [...container.querySelectorAll('.props-note')].map((n) =>
			n.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(inherited).toEqual([
			'Also accepts every <a> attribute.',
			'Also accepts every prop of ButtonProps.'
		]);
	});

	it('lets a title override the generated caption', () => {
		render(PropsTable, { props: { of: extracted, title: 'Picker' } });
		expect(screen.getByText('Picker')).toBeInTheDocument();
		expect(screen.queryByText('Select<T>')).toBeNull();
	});

	it('says so when a component has no props', () => {
		render(PropsTable, {
			props: { of: { name: 'Empty', typeParameters: [], props: [], inherited: [] } }
		});
		expect(screen.getByText('No props.')).toBeInTheDocument();
	});

	it('shows since on the caption and on a row', () => {
		const { container } = render(PropsTable, {
			props: {
				of: {
					name: 'Label',
					typeParameters: [],
					since: '0.4',
					props: [{ name: 'compact', required: false, bindable: false, since: '0.6' }],
					inherited: []
				}
			}
		});
		expect(container.querySelector('.props-table-since')?.textContent).toBe('since 0.4');
		expect(screen.getByText('since 0.6')).toBeInTheDocument();
	});

	it('opens object props into collapsed, nested field rows grouped by shape', async () => {
		const { container } = render(PropsTable, {
			props: {
				of: {
					name: 'Popover',
					typeParameters: [],
					inherited: [],
					props: [
						{
							name: 'options',
							type: 'Options',
							required: false,
							bindable: false,
							fields: [
								{
									fields: [
										{
											name: 'placement',
											type: 'Placement',
											required: true,
											description: 'Where it <code>sits</code>.',
											fields: [{ fields: [{ name: 'side', required: true }] }]
										}
									]
								}
							]
						},
						{
							name: 'choice',
							required: false,
							bindable: false,
							fields: [
								{ label: "kind: 'text'", fields: [{ name: 'placeholder', required: false }] },
								{ label: "kind: 'number'", fields: [{ name: 'min', required: false }] }
							]
						},
						{ name: 'label', required: false, bindable: false }
					]
				}
			}
		});
		const disclosures = [...container.querySelectorAll('details.prop-fields')];
		// One per prop or field that opens: options, its placement, choice.
		expect(disclosures).toHaveLength(3);
		expect(disclosures.every((d) => !(d as HTMLDetailsElement).open)).toBe(true);
		const names = [...container.querySelectorAll('.prop-name')].map((n) => n.textContent);
		expect(names).toEqual([
			'options',
			'placement',
			'side',
			'choice',
			'placeholder',
			'min',
			'label'
		]);
		expect(screen.getByText('sits').tagName).toBe('CODE');
		const shapes = [...container.querySelectorAll('.props-shape')].map((n) => n.textContent);
		expect(shapes).toEqual(["kind: 'text'", "kind: 'number'"]);
	});
});
