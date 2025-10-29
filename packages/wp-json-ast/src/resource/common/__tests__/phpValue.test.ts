import { buildScalarInt } from '@wpkernel/php-json-ast';
import { expression, renderPhpValue, variable } from '../phpValue';
import type { PhpExpr, PhpExprArray } from '@wpkernel/php-json-ast';

function expectArrayExpression(expr: PhpExpr): PhpExprArray {
	expect(expr.nodeType).toBe('Expr_Array');
	if (expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected rendered value to be an array');
	}
	return expr as PhpExprArray;
}

describe('resource/common/phpValue', () => {
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
		const arrayExpr = expectArrayExpression(rendered);
		const items = arrayExpr.items;
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'ArrayItem',
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
