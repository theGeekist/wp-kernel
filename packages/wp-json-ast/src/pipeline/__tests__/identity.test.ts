import type { ResourceIdentityConfig } from '@wpkernel/core/resource';
import {
	buildIdentityGuardStatements,
	resolveIdentityConfig,
} from '../identity';

describe('resolveIdentityConfig', () => {
	it('defaults to numeric id when identity is missing', () => {
		const resource = buildResource();

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'number',
			param: 'id',
		});
	});

	it('defaults to slug parameter for string identities without explicit param', () => {
		const resource = buildResource({
			type: 'string',
		});

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'string',
			param: 'slug',
		});
	});

	it('preserves explicit identity parameters', () => {
		const resource = buildResource({
			type: 'string',
			param: 'uuid',
		});

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'string',
			param: 'uuid',
		});
	});
});

describe('buildIdentityGuardStatements', () => {
	it('emits numeric guard statements with casts and range check', () => {
		const statements = buildIdentityGuardStatements({
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

	it('emits string guard statements with trim', () => {
		const statements = buildIdentityGuardStatements({
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

function buildResource(identity?: ResourceIdentityConfig | null): {
	readonly identity: ResourceIdentityConfig | null;
} {
	return {
		identity: identity ?? null,
	};
}
