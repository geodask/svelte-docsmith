import { describe, expect, it } from 'vitest';
import type { ExtractedProps } from './extracted-props.js';
import { deprecationNote, plainDescription, propsReference } from './props-reference.js';

const props = (rest: Partial<ExtractedProps> = {}): ExtractedProps => ({
	name: 'Select',
	typeParameters: [],
	props: [],
	inherited: [],
	...rest
});

describe('propsReference', () => {
	it('captions the table with the component name and its type parameters', () => {
		expect(propsReference(props()).caption).toBe('Select');
		expect(propsReference(props({ typeParameters: ['T', 'U'] })).caption).toBe('Select<T, U>');
	});

	it("lets the author's title replace the caption", () => {
		expect(propsReference(props({ typeParameters: ['T'] }), 'Picker').caption).toBe('Picker');
	});

	it('gives each prop a row, with the deprecation note before the description', () => {
		const { rows } = propsReference(
			props({
				props: [
					{
						name: 'variant',
						type: "'a' | 'b'",
						default: "'a'",
						required: false,
						bindable: false,
						description: 'Visual intent.'
					},
					{
						name: 'old',
						required: true,
						bindable: true,
						deprecated: 'Use <code>value</code>.',
						description: 'The old value.'
					}
				]
			})
		);
		expect(rows).toEqual([
			{
				name: 'variant',
				type: "'a' | 'b'",
				default: "'a'",
				required: false,
				bindable: false,
				deprecated: false,
				description: ['Visual intent.']
			},
			{
				name: 'old',
				type: undefined,
				default: undefined,
				required: true,
				bindable: true,
				deprecated: true,
				description: ['Deprecated: Use <code>value</code>.', 'The old value.']
			}
		]);
	});

	it('marks a bare @deprecated without adding a note', () => {
		const { rows } = propsReference(
			props({ props: [{ name: 'old', required: false, bindable: false, deprecated: '' }] })
		);
		expect(rows[0]).toMatchObject({ deprecated: true, description: [] });
	});

	it('sums up inherited attributes by what they belong to', () => {
		const { notes } = propsReference(
			props({
				props: [{ name: 'size', required: false, bindable: false }],
				inherited: [
					{ kind: 'element', label: 'a' },
					{ kind: 'type', label: 'ButtonProps' }
				]
			})
		);
		expect(notes).toEqual([
			['Also accepts every ', { code: '<a>' }, ' attribute.'],
			['Also accepts every prop of ', { code: 'ButtonProps' }, '.']
		]);
	});

	it('says so when a component takes no props', () => {
		expect(propsReference(props()).notes).toEqual([['No props.']]);
		expect(propsReference(props({ inherited: [{ kind: 'element', label: 'div' }] })).notes).toEqual(
			[['Also accepts every ', { code: '<div>' }, ' attribute.']]
		);
	});
});

describe('deprecationNote', () => {
	it('prefixes the text', () => {
		expect(deprecationNote('Use <code>value</code>.')).toBe('Deprecated: Use <code>value</code>.');
	});

	it('opens the first paragraph when the text is paragraphs of HTML', () => {
		// The agent markdown row reads `Deprecated: Use a.<br><br>Removed in 2.0.`
		expect(deprecationNote('<p>Use a.</p>\n<p>Removed in 2.0.</p>')).toBe(
			'<p>Deprecated: Use a.</p>\n<p>Removed in 2.0.</p>'
		);
	});
});

describe('plainDescription', () => {
	it('drops tags and decodes the entities the build-time renderer writes', () => {
		expect(plainDescription('Use <code>a &lt; b</code> &amp; &quot;c&quot; &#39;d&#39;.')).toBe(
			`Use a < b & "c" 'd'.`
		);
		expect(plainDescription(undefined)).toBeUndefined();
	});

	it('breaks lines where the HTML does, and joins soft breaks with a space', () => {
		expect(plainDescription('First line<br>Second line')).toBe('First line\nSecond line');
		expect(plainDescription('<p>One\nsentence.</p>\n<p>Two.</p>')).toBe('One sentence.\nTwo.');
		expect(plainDescription('<ul>\n<li>a</li><li>b</li>\n</ul>')).toBe('a\nb');
	});

	it('decodes numeric and common named references, and leaves unknown ones as written', () => {
		expect(plainDescription('a&nbsp;b &mdash; c &#8212; d &#x2014; e')).toBe(
			'a\u00a0b \u2014 c \u2014 d \u2014 e'
		);
		expect(plainDescription('&LT;b&GT;')).toBe('<b>');
		expect(plainDescription('&notanentity; &#0; &#xD800;')).toBe('&notanentity; &#0; &#xD800;');
	});

	it('keeps non-breaking spaces', () => {
		expect(plainDescription('10\u00a0px, &nbsp;&nbsp;indented')).toBe(
			'10\u00a0px, \u00a0\u00a0indented'
		);
	});

	it("keeps a code block's lines and indentation", () => {
		expect(
			plainDescription(
				'<p>For example:</p>\n<pre><code class="language-ts">if (a) {\n  b &amp;&amp; c;\n}\n</code></pre>\n<p>Then.</p>'
			)
		).toBe('For example:\nif (a) {\n  b && c;\n}\nThen.');
	});
});
