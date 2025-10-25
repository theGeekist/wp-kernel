import {
	buildArg,
	buildComment,
	buildName,
	buildNode,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpExprNew,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { IRRoute } from '../../../../ir/types';

export function buildNotImplementedStatements(route: IRRoute): PhpStmt[] {
	const todo = buildStmtNop({
		comments: [
			buildComment(
				`// TODO: Implement handler for [${route.method}] ${route.path}.`
			),
		],
	});

	const errorExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarInt(501)),
			buildArg(buildScalarString('Not Implemented')),
		],
	});

	const returnStatement = buildReturn(errorExpr);

	return [todo, returnStatement];
}
