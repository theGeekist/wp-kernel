import type {
	ResourceControllerMetadata,
	ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	buildPaginationNormalisationStatements,
	buildQueryArgsAssignmentStatement,
	buildPageExpression,
	buildWpQueryExecutionStatement,
} from '../query';
import { renderPhpValue, variable } from '../phpValue';

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
		const items = assignment.expr.expr?.items ?? [];
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'Expr_ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'post_type',
					}),
				}),
				expect.objectContaining({
					nodeType: 'Expr_ArrayItem',
					key: expect.objectContaining({
						nodeType: 'Scalar_String',
						value: 'fields',
					}),
				}),
				expect.objectContaining({
					nodeType: 'Expr_ArrayItem',
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
		const args = expr.args ?? [];
		expect(args).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					value: expect.objectContaining({
						nodeType: 'Scalar_LNumber',
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
