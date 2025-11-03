import {
	buildIsWpErrorGuard,
	buildReturnIfWpError,
	buildWpErrorExpression,
	buildWpErrorReturn,
} from '../errors';
import {
	buildReturn,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpExprNew,
	type PhpStmtReturn,
} from '@wpkernel/php-json-ast';

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

	it('defaults the error status code when one is not provided', () => {
		const statement = buildWpErrorReturn({
			code: 'demo_error',
			message: 'Demo message.',
		});

		const expr = expectNewExpression(statement.expr ?? undefined);
		const statusArgument = expr.args?.[2];
		const metadata = statusArgument?.value ?? null;

		expect(metadata).toMatchObject({
			nodeType: 'Expr_Array',
			items: expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({
						value: 'status',
					}),
					value: expect.objectContaining({ value: 400 }),
				}),
			]),
		});
	});

	it('builds guards that return early when a WP_Error is encountered', () => {
		const expression = buildVariable('result');
		const returnStatement: PhpStmtReturn = buildReturn(
			buildScalarString('early exit')
		);

		const guard = buildIsWpErrorGuard({
			expression,
			statements: [returnStatement],
		});

		expect(guard).toMatchObject({
			nodeType: 'Stmt_If',
			cond: expect.objectContaining({
				nodeType: 'Expr_FuncCall',
				name: expect.objectContaining({ parts: ['is_wp_error'] }),
			}),
			stmts: [returnStatement],
		});

		const shorthand = buildReturnIfWpError(expression);
		expect(shorthand).toMatchObject({
			stmts: [
				expect.objectContaining({
					nodeType: 'Stmt_Return',
					expr: expression,
				}),
			],
		});
	});

	it('builds reusable WP_Error expressions', () => {
		const expr = buildWpErrorExpression({
			code: 'demo_error',
			message: 'Demo message.',
		});

		expect(expr).toMatchObject({
			nodeType: 'Expr_New',
			class: expect.objectContaining({ parts: ['WP_Error'] }),
		});
	});
});
