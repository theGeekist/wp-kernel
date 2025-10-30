import type { PhpStmtIf } from '@wpkernel/php-json-ast';

import {
	buildMetaQueryStatements,
	collectMetaQueryEntries,
} from '../metaQuery';

describe('wpPost meta query helpers', () => {
	it('collects meta query entries with descriptor cloning', () => {
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

		const ensureArray = guard.stmts[0];
		const normalise = guard.stmts[1];
		const filter = guard.stmts[2];
		const ensureNonEmpty = guard.stmts[3];

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
});
