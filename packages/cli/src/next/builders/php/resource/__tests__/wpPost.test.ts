import {
	buildMetaQueryStatements,
	collectMetaQueryEntries,
} from '../wpPost/metaQuery';
import { collectTaxonomyQueryEntries } from '../wpPost/taxonomyQuery';
import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
} from '../wpPost/list';
import { buildIdentityValidationStatements } from '../wpPost/identity';
import type { PhpStmtIf } from '@wpkernel/php-json-ast';

describe('wpPost query helpers', () => {
	it('collects meta query entries', () => {
		const entries = collectMetaQueryEntries({
			meta: {
				genre: { single: false },
				subtitle: null,
			},
		});

		expect(entries).toEqual([
			['genre', { single: false }],
			['subtitle', undefined],
		]);
	});

	it('normalises multi-value meta queries without coercing retained values', () => {
		const statements = buildMetaQueryStatements({
			entries: [['genre', { single: false }]],
		});

		expect(statements).toHaveLength(4);

		const guard = statements[2] as PhpStmtIf;
		expect(guard.nodeType).toBe('Stmt_If');

		const [ensureArray, normalise, filter, ensureNonEmpty] =
			guard.stmts as const;

		expect(ensureArray).toMatchObject({ nodeType: 'Stmt_If' });
		expect((ensureArray as PhpStmtIf).cond).toMatchObject({
			nodeType: 'Expr_BooleanNot',
			expr: expect.objectContaining({
				nodeType: 'Expr_FuncCall',
				name: expect.objectContaining({ parts: ['is_array'] }),
			}),
		});

		expect(normalise).toMatchObject({ nodeType: 'Stmt_Expression' });
		expect(
			(normalise as { expr: { expr: { name: { parts: string[] } } } })
				.expr.expr.name.parts
		).toContain('array_values');

		expect(filter).toMatchObject({ nodeType: 'Stmt_Expression' });
		const filterCall = (
			filter as {
				expr: { expr: { name: { parts: string[] }; args: unknown[] } };
			}
		).expr.expr;
		expect(filterCall.name.parts).toContain('array_filter');
		expect(filterCall.args[0]).toMatchObject({
			value: expect.objectContaining({
				nodeType: 'Expr_Variable',
				name: 'genreMeta',
			}),
		});
		expect(filterCall.args[1]).toMatchObject({
			value: expect.objectContaining({
				nodeType: 'Expr_ArrowFunction',
				expr: expect.objectContaining({
					nodeType: 'Expr_Match',
				}),
			}),
		});

		expect(ensureNonEmpty).toMatchObject({ nodeType: 'Stmt_If' });
		expect((ensureNonEmpty as PhpStmtIf).cond).toMatchObject({
			nodeType: 'Expr_BinaryOp_Greater',
			right: expect.objectContaining({
				nodeType: expect.stringMatching(/^Scalar_/),
				value: 0,
			}),
		});
	});

	it('collects taxonomy query entries', () => {
		const entries = collectTaxonomyQueryEntries({
			taxonomies: {
				category: { taxonomy: 'category' },
				invalid: {},
			},
		});

		expect(entries).toEqual([['category', { taxonomy: 'category' }]]);
	});
});

describe('wpPost list helpers', () => {
	it('initialises the items array with indentation', () => {
		const statement = buildListItemsInitialiserStatement();
		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: {
					nodeType: 'Expr_Variable',
					name: 'items',
				},
				expr: {
					nodeType: 'Expr_Array',
					items: [],
				},
			},
		});
	});

	it('creates the foreach loop with guards and response push', () => {
		const foreachNode = buildListForeachStatement({
			pascalName: 'Article',
		});

		expect(foreachNode.nodeType).toBe('Stmt_Foreach');
		expect(foreachNode.expr).toMatchObject({
			nodeType: 'Expr_PropertyFetch',
			var: { nodeType: 'Expr_Variable', name: 'query' },
			name: { nodeType: 'Identifier', name: 'posts' },
		});

		const [assignment, guard, push] = foreachNode.stmts as const;
		expect(assignment).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'post' },
				expr: {
					nodeType: 'Expr_FuncCall',
					name: { parts: ['get_post'] },
				},
			},
		});
		expect(guard).toMatchObject({
			nodeType: 'Stmt_If',
			cond: {
				nodeType: 'Expr_BooleanNot',
				expr: {
					nodeType: 'Expr_Instanceof',
					expr: { nodeType: 'Expr_Variable', name: 'post' },
					class: { parts: ['WP_Post'] },
				},
			},
			stmts: [{ nodeType: 'Stmt_Continue' }],
		});
		expect(push).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: {
					nodeType: 'Expr_ArrayDimFetch',
					var: { nodeType: 'Expr_Variable', name: 'items' },
				},
				expr: {
					nodeType: 'Expr_MethodCall',
					name: {
						nodeType: 'Identifier',
						name: 'prepareArticleResponse',
					},
				},
			},
		});
	});
});

describe('wpPost identity helpers', () => {
	it('creates numeric identifier validation statements', () => {
		const statements = buildIdentityValidationStatements({
			identity: { type: 'number', param: 'book_id' },
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(statements).toHaveLength(3);
		expect(statements[0]).toEqual(
			expect.objectContaining({
				nodeType: 'Stmt_If',
				cond: expect.objectContaining({
					nodeType: 'Expr_BinaryOp_Identical',
					right: expect.objectContaining({
						nodeType: 'Expr_Variable',
						name: 'book_id',
					}),
				}),
				stmts: expect.arrayContaining([
					expect.objectContaining({
						nodeType: 'Stmt_Return',
						expr: expect.objectContaining({
							nodeType: 'Expr_New',
							args: expect.arrayContaining([
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'book_missing_identifier',
									}),
								}),
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'Missing identifier for Book.',
									}),
								}),
							]),
						}),
					}),
				]),
			})
		);
		expect(statements[1]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'book_id' },
				expr: { nodeType: 'Expr_Cast_Int' },
			},
		});
		expect(statements[2]).toEqual(
			expect.objectContaining({
				nodeType: 'Stmt_If',
				cond: expect.objectContaining({
					nodeType: 'Expr_BinaryOp_SmallerOrEqual',
					left: expect.objectContaining({
						nodeType: 'Expr_Variable',
						name: 'book_id',
					}),
				}),
				stmts: expect.arrayContaining([
					expect.objectContaining({
						nodeType: 'Stmt_Return',
						expr: expect.objectContaining({
							nodeType: 'Expr_New',
							args: expect.arrayContaining([
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'book_invalid_identifier',
									}),
								}),
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'Invalid identifier for Book.',
									}),
								}),
							]),
						}),
					}),
				]),
			})
		);
	});

	it('creates string identifier validation statements', () => {
		const statements = buildIdentityValidationStatements({
			identity: { type: 'string', param: 'slug' },
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(statements).toHaveLength(2);
		expect(statements[0]).toEqual(
			expect.objectContaining({
				nodeType: 'Stmt_If',
				cond: expect.objectContaining({
					nodeType: 'Expr_BinaryOp_BooleanOr',
				}),
				stmts: expect.arrayContaining([
					expect.objectContaining({
						nodeType: 'Stmt_Return',
						expr: expect.objectContaining({
							nodeType: 'Expr_New',
							args: expect.arrayContaining([
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'book_missing_identifier',
									}),
								}),
								expect.objectContaining({
									value: expect.objectContaining({
										value: 'Missing identifier for Book.',
									}),
								}),
							]),
						}),
					}),
				]),
			})
		);
		expect(statements[1]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'slug' },
				expr: {
					nodeType: 'Expr_FuncCall',
					name: { parts: ['trim'] },
				},
			},
		});
	});
});
