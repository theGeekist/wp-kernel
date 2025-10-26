import { buildWpErrorReturn } from '../errors';
import type { PhpExpr, PhpExprNew } from '@wpkernel/php-json-ast';

function expectNewExpression(expr: PhpExpr | null | undefined): PhpExprNew {
	expect(expr?.nodeType).toBe('Expr_New');
	if (!expr || expr.nodeType !== 'Expr_New') {
		throw new Error('Expected WP_Error constructor expression');
	}
	return expr as PhpExprNew;
}

describe('resource error helpers', () => {
	it('builds a WP_Error return statement with status metadata', () => {
		const statement = buildWpErrorReturn({
			code: 'demo_error',
			message: 'Demo message.',
			status: 418,
		});

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: { nodeType: 'Expr_New', class: { parts: ['WP_Error'] } },
		});

		const expr = expectNewExpression(statement.expr ?? undefined);
		const args = expr.args ?? [];
		expect(args).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'demo_error',
					}),
				}),
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'Demo message.',
					}),
				}),
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Expr_Array',
						items: expect.arrayContaining([
							expect.objectContaining({
								key: expect.objectContaining({
									nodeType: 'Scalar_String',
									value: 'status',
								}),
								value: expect.objectContaining({
									nodeType: 'Scalar_Int',
									value: 418,
								}),
								nodeType: 'ArrayItem',
							}),
						]),
					}),
				}),
			])
		);
	});
});
