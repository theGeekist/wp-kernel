import type {
	PhpExprAssign,
	PhpExprMethodCall,
	PhpExprNew,
	PhpExprVariable,
	PhpStmt,
	PhpStmtExpression,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

import type { ResourceMetadataHost } from '../../cache';
import type { ResourceControllerMetadata } from '../../../types';

export function createMetadataHost(): {
	metadata: ResourceControllerMetadata;
	host: ResourceMetadataHost;
} {
	const metadata: ResourceControllerMetadata = {
		kind: 'resource-controller',
		name: 'taxonomyController',
		identity: { type: 'string', param: 'slug' },
		routes: [],
	};

	return {
		metadata,
		host: {
			getMetadata: () => metadata,
			setMetadata: (next) => {
				Object.assign(metadata, next as ResourceControllerMetadata);
			},
		},
	};
}

export function isExpressionStatement(
	statement: PhpStmt | undefined
): statement is PhpStmtExpression {
	return statement?.nodeType === 'Stmt_Expression';
}

export function isVariableAssignment(
	statement: PhpStmt | undefined,
	variableName: string
): statement is PhpStmtExpression & {
	expr: PhpExprAssign & { var: PhpExprVariable };
} {
	if (!isExpressionStatement(statement)) {
		return false;
	}

	if (statement.expr.nodeType !== 'Expr_Assign') {
		return false;
	}

	const assign = statement.expr as PhpExprAssign;
	if (assign.var.nodeType !== 'Expr_Variable') {
		return false;
	}

	const variable = assign.var as PhpExprVariable;
	return variable.name === variableName;
}

export function expectReturnStatement(
	statement: PhpStmt | undefined
): PhpStmtReturn {
	if (statement?.nodeType === 'Stmt_Return') {
		return statement as PhpStmtReturn;
	}

	throw new Error('Expected return statement');
}

export function expectMethodCall(
	statement: PhpStmtReturn,
	methodName: string
): PhpExprMethodCall {
	const expr = statement.expr;
	if (!expr || expr.nodeType !== 'Expr_MethodCall') {
		throw new Error('Expected method call expression in return');
	}

	const methodCall = expr as PhpExprMethodCall;
	if (
		methodCall.name.nodeType !== 'Identifier' ||
		methodCall.name.name !== methodName
	) {
		throw new Error(`Expected method call to ${methodName}`);
	}

	return methodCall;
}

export function isNewAssignment(
	statement: PhpStmt | undefined,
	variableName: string,
	className: string
): statement is PhpStmtExpression & {
	expr: PhpExprAssign & { expr: PhpExprNew };
} {
	if (!isVariableAssignment(statement, variableName)) {
		return false;
	}

	const expr = statement.expr as PhpExprAssign;
	if (expr.expr.nodeType !== 'Expr_New') {
		return false;
	}

	const instantiation = expr.expr as PhpExprNew;
	if (instantiation.class.nodeType !== 'Name') {
		return false;
	}

	const parts = instantiation.class.parts ?? [];
	return parts.join('\\') === className;
}
