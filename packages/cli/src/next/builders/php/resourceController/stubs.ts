import {
	buildArg,
	buildComment,
	buildName,
	buildNew,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
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

	const errorExpr = buildNew(buildName(['WP_Error']), [
		buildArg(buildScalarInt(501)),
		buildArg(buildScalarString('Not Implemented')),
	]);

	const returnStatement = buildReturn(errorExpr);

	return [todo, returnStatement];
}
