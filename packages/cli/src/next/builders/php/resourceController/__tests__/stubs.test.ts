import type { PhpStmtReturn } from '@wpkernel/php-json-ast';
import { buildNotImplementedStatements } from '../stubs';

function buildRoute() {
	return {
		method: 'POST',
		path: '/kernel/v1/books',
		policy: undefined,
		hash: 'create',
		transport: 'local',
	};
}

describe('buildNotImplementedStatements', () => {
	it('returns a TODO comment and WP_Error return statement', () => {
		const statements = buildNotImplementedStatements(buildRoute());

		expect(statements).toHaveLength(2);
		expect(statements[0].nodeType).toBe('Stmt_Nop');
		expect(statements[0].attributes?.comments).toHaveLength(1);

		const returnStatement = statements[1] as PhpStmtReturn;
		expect(returnStatement.nodeType).toBe('Stmt_Return');
		expect(returnStatement.expr?.nodeType).toBe('Expr_New');
	});
});
