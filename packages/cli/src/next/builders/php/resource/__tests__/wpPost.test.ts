import {
	appendMetaQueryBuilder,
	collectMetaQueryEntries,
} from '../wpPost/metaQuery';
import { collectTaxonomyQueryEntries } from '../wpPost/taxonomyQuery';
import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
} from '../wpPost/list';
import { buildIdentityValidationStatements } from '../wpPost/identity';
import { PhpMethodBodyBuilder, PHP_INDENT } from '@wpkernel/php-json-ast';

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
		const body = new PhpMethodBodyBuilder(PHP_INDENT, 1);

		appendMetaQueryBuilder({
			body,
			indentLevel: 1,
			entries: [['genre', { single: false }]],
		});

		const lines = body.toLines();
		expect(lines).toContain(
			'                $genreMeta = array_values((array) $genreMeta);'
		);
		const filterLine = lines.find((line) =>
			line.includes('$genreMeta = array_filter')
		);
		expect(filterLine).toBeDefined();
		expect(filterLine).toContain(
			'static fn ($value) => match (trim((string) $value)) {'
		);
		expect(filterLine).toContain("'' => false");
		expect(filterLine).toContain('default => true');
		expect(lines).not.toContain("array_map( 'strval'");
		expect(lines).not.toContain("array_map( 'trim'");
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
