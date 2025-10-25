import { buildNotImplementedStatements } from '../stubs';
import type { PhpExpr } from '@wpkernel/php-json-ast';
import { makeWpPostRoutes } from '@wpkernel/test-utils/next/builders/php/resources.test-support';

describe('buildNotImplementedStatements', () => {
	it('returns a TODO comment and WP_Error return statement', () => {
		const [createRoute] = makeWpPostRoutes().filter(
			(route) => route.hash === 'create'
		);
		expect(createRoute).toBeDefined();

		if (!createRoute) {
			throw new Error('Expected to find create route');
		}

		const statements = buildNotImplementedStatements(createRoute);
		const [nop, returnStatement] = statements;

		expect(statements).toHaveLength(2);
		expect(nop?.nodeType).toBe('Stmt_Nop');
		expect(nop?.attributes?.comments).toHaveLength(1);

		if (!returnStatement || returnStatement.nodeType !== 'Stmt_Return') {
			throw new Error(
				'Expected return statement to be a WP_Error constructor'
			);
		}
		const returnExpr = (returnStatement as { expr: PhpExpr | null }).expr;
		expect(returnExpr?.nodeType).toBe('Expr_New');
	});
});
