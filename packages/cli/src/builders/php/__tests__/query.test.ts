import type {
	PhpExpr,
	PhpExprArray,
	PhpExprFuncCall,
} from '@wpkernel/php-json-ast';
import type {
	ResourceControllerMetadata,
	ResourceMetadataHost,
} from '@wpkernel/wp-json-ast';
import {
	buildPaginationNormalisationStatements,
	buildQueryArgsAssignmentStatement,
	buildPageExpression,
	buildWpQueryExecutionStatement,
	renderPhpValue,
	variable,
} from '@wpkernel/wp-json-ast';

function expectArrayExpression(expr: PhpExpr | undefined): PhpExprArray {
	expect(expr?.nodeType).toBe('Expr_Array');
	if (!expr || expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected array expression');
	}
	return expr as PhpExprArray;
}

function expectFuncCall(expr: PhpExpr): PhpExprFuncCall {
	expect(expr.nodeType).toBe('Expr_FuncCall');
	if (expr.nodeType !== 'Expr_FuncCall') {
		throw new Error('Expected function call expression');
	}
	return expr as PhpExprFuncCall;
}

describe('query helpers', () => {
	it('creates query arg assignments', () => {
		const assignment = buildQueryArgsAssignmentStatement({
			targetVariable: 'query_args',
			entries: [
				{ key: 'post_type', value: variable('post_type') },
				{ key: 'fields', value: 'ids' },
				{
					key: 'paged',
					value: buildPageExpression({
						requestVariable: '$request',
					}),
				},
			],
		});

		expect(assignment.nodeType).toBe('Stmt_Expression');
		expect(assignment.expr).toMatchObject({
			nodeType: 'Expr_Assign',
			var: { nodeType: 'Expr_Variable', name: 'query_args' },
		});
		const assignExprCandidate = assignment.expr;
		if (
			!assignExprCandidate ||
			assignExprCandidate.nodeType !== 'Expr_Assign'
		) {
			throw new Error(
				'Expected query args assignment to use Expr_Assign'
			);
		}
		const assignExpr = assignExprCandidate as Extract<
			NonNullable<typeof assignment.expr>,
			{ nodeType: 'Expr_Assign'; expr: PhpExpr }
		>;
		const arrayExpr = expectArrayExpression(assignExpr.expr);
		const items = arrayExpr.items ?? [];
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'post_type',
					}),
				}),
				expect.objectContaining({
					nodeType: 'ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'fields',
					}),
				}),
				expect.objectContaining({
					nodeType: 'ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'paged',
					}),
				}),
			])
		);
	});

	it('creates query arg assignments with no entries', () => {
		const assignment = buildQueryArgsAssignmentStatement({
			targetVariable: 'query_args',
			entries: [],
		});

		expect(assignment).toMatchObject({
			expr: {
				expr: {
					nodeType: 'Expr_Array',
					items: [],
				},
			},
		});
	});

	it('normalises pagination parameters', () => {
		const [assign, ensurePositive, clamp] =
			buildPaginationNormalisationStatements({
				requestVariable: '$request',
				targetVariable: 'per_page',
			});

		expect(assign).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: { nodeType: 'Expr_Cast_Int' },
			},
		});
		expect(ensurePositive).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_SmallerOrEqual' },
		});
		expect(clamp).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_Greater' },
		});
	});

	it('creates page expression descriptors', () => {
		const descriptor = buildPageExpression({
			requestVariable: '$request',
		});
		const expr = renderPhpValue(descriptor);
		expect(expr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: { nodeType: 'Name', parts: ['max'] },
		});
		const funcCall = expectFuncCall(expr);
		const args = funcCall.args ?? [];
		expect(args).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_Int',
						value: 1,
					}),
				}),
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Expr_Cast_Int',
						expr: expect.objectContaining({
							nodeType: 'Expr_MethodCall',
							name: expect.objectContaining({
								nodeType: 'Identifier',
								name: 'get_param',
							}),
						}),
					}),
				}),
			])
		);
	});

	it('executes WP_Query and records cache metadata', () => {
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'demo',
			identity: { type: 'number', param: 'id' },
			routes: [],
		};

		const host: ResourceMetadataHost = {
			getMetadata: () => metadata,
			setMetadata: (next) => {
				Object.assign(metadata, next);
			},
		};

		const statement = buildWpQueryExecutionStatement({
			target: 'query',
			argsVariable: 'args',
			cache: {
				host,
				scope: 'list',
				operation: 'read',
				segments: ['demo'],
			},
		});

		expect(statement).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: { nodeType: 'Expr_New' },
			},
		});
		expect(metadata.cache?.events).toHaveLength(1);
	});

	it('executes WP_Query without cache metadata when cache is omitted', () => {
		const statement = buildWpQueryExecutionStatement({
			target: 'query',
			argsVariable: 'args',
		});

		expect(statement).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: { nodeType: 'Expr_New' },
			},
		});
	});
});
