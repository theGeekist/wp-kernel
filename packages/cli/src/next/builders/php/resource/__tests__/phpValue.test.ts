import { buildScalarInt } from '@wpkernel/php-json-ast';
import { expression, renderPhpValue, variable } from '../phpValue';

describe('phpValue', () => {
	it('renders variable descriptors', () => {
		const rendered = renderPhpValue(variable('items'));
		expect(rendered).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'items',
		});
	});

	it('renders expression descriptors with indentation', () => {
		const scalar = buildScalarInt(5);
		const rendered = renderPhpValue(expression(scalar));
		expect(rendered).toBe(scalar);
	});

	it('renders structured literals', () => {
		const rendered = renderPhpValue({ key: 'value' });
		expect(rendered.nodeType).toBe('Expr_Array');
		expect(rendered.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'Expr_ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'key',
					}),
					value: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'value',
					}),
				}),
			])
		);
	});
});
