import {
	buildArray,
	buildArrayDimFetch as buildArrayDimFetchNode,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation as buildBinaryOperationPrimitive,
	buildBooleanNot as buildBooleanNotExpr,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildInstanceof as buildInstanceofExpr,
	buildMethodCall,
	buildName,
	buildPropertyFetch as buildPropertyFetchNode,
	buildReturn,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	type PhpArg,
	type PhpBinaryOperator,
	type PhpExpr,
	type PhpExprBooleanNot,
	type PhpExprFuncCall,
	type PhpExprMethodCall,
	type PhpStmt,
	type PhpStmtExpression,
	type PhpStmtForeach,
	type PhpStmtIf,
	type PhpStmtReturn,
} from '@wpkernel/php-json-ast';
import {
	buildScalarCast,
	normaliseVariableReference,
	type NormalisedVariableReference,
	type ScalarCastKind,
} from '../../common/request';

export type { NormalisedVariableReference, ScalarCastKind };

export { normaliseVariableReference, buildScalarCast };

export function buildBinaryOperation(
	operator: PhpBinaryOperator,
	left: PhpExpr,
	right: PhpExpr
) {
	return buildBinaryOperationPrimitive(operator, left, right);
}

export interface IfStatementOptions {
	readonly condition: PhpExpr;
	readonly statements: readonly PhpStmt[];
}

export function buildIfStatementNode(options: IfStatementOptions): PhpStmtIf {
	return buildIfStatement(options.condition, [...options.statements]);
}

export function buildArrayDimFetch(
	target: string,
	dim: PhpExpr | null
): PhpExpr {
	return buildArrayDimFetchNode(buildVariable(target), dim);
}

export function buildPropertyFetch(target: string, property: string): PhpExpr {
	return buildPropertyFetchNode(
		buildVariable(target),
		buildIdentifier(property)
	);
}

export function buildInstanceof(subject: string, className: string): PhpExpr {
	return buildInstanceofExpr(buildVariable(subject), buildName([className]));
}

export function buildBooleanNot(expr: PhpExpr): PhpExprBooleanNot {
	return buildBooleanNotExpr(expr);
}

export function buildReturnVoid(): PhpStmtReturn {
	return buildReturn(null);
}

export function buildVariableAssignment(
	target: NormalisedVariableReference,
	expression: PhpExpr
): PhpStmtExpression {
	return buildExpressionStatement(
		buildAssign(buildVariable(target.raw), expression)
	);
}

export type MethodCallSubject = string | PhpExpr;

export interface MethodCallExpressionOptions {
	readonly subject: MethodCallSubject;
	readonly method: string;
	readonly args?: readonly PhpArg[];
}

export function buildMethodCallExpression(
	options: MethodCallExpressionOptions
): PhpExprMethodCall {
	const receiver =
		typeof options.subject === 'string'
			? buildVariable(normaliseVariableReference(options.subject).raw)
			: options.subject;

	const args = options.args ? [...options.args] : [];

	return buildMethodCall(receiver, buildIdentifier(options.method), args);
}

export interface MethodCallAssignmentOptions
	extends MethodCallExpressionOptions {
	readonly variable: string;
}

export function buildMethodCallAssignmentStatement(
	options: MethodCallAssignmentOptions
): PhpStmtExpression {
	const { variable, ...callOptions } = options;
	const expression = buildMethodCallExpression(callOptions);

	return buildVariableAssignment(
		normaliseVariableReference(variable),
		expression
	);
}

export function buildFunctionCall(
	functionName: string,
	args: readonly PhpArg[] = []
): PhpExprFuncCall {
	return buildFuncCall(buildName([functionName]), [...args]);
}

export interface FunctionCallAssignmentOptions {
	readonly variable: string;
	readonly functionName: string;
	readonly args?: readonly PhpArg[];
}

export function buildFunctionCallAssignmentStatement(
	options: FunctionCallAssignmentOptions
): PhpStmtExpression {
	return buildVariableAssignment(
		normaliseVariableReference(options.variable),
		buildFunctionCall(options.functionName, options.args ?? [])
	);
}

export function appendStatementsWithSpacing(
	target: PhpStmt[],
	statements: readonly PhpStmt[]
): void {
	if (statements.length === 0) {
		return;
	}

	target.push(...statements);

	const last = statements[statements.length - 1]!;
	if (last.nodeType !== 'Stmt_Nop') {
		target.push(buildStmtNop());
	}
}

export interface ArrayInitialiserStatementOptions {
	readonly variable: string;
}

export function buildArrayInitialiserStatement(
	options: ArrayInitialiserStatementOptions
): PhpStmtExpression {
	return buildVariableAssignment(
		normaliseVariableReference(options.variable),
		buildArray([])
	);
}

export interface ArrayLiteralEntry {
	readonly key?: string;
	readonly value: PhpExpr;
}

export function buildArrayLiteral(
	entries: readonly ArrayLiteralEntry[]
): PhpExpr {
	const items = entries.map((entry) =>
		buildArrayItem(entry.value, {
			key:
				entry.key === undefined
					? undefined
					: buildScalarString(entry.key),
		})
	);

	return buildArray(items);
}

export interface ForeachStatementOptions {
	readonly iterable: PhpExpr;
	readonly value: string | PhpExpr;
	readonly statements: readonly PhpStmt[];
	readonly key?: string | PhpExpr | null;
	readonly byRef?: boolean;
}

export function buildForeachStatement(
	options: ForeachStatementOptions
): PhpStmtForeach {
	let keyVar: PhpExpr | null;
	if (options.key === undefined || options.key === null) {
		keyVar = null;
	} else if (typeof options.key === 'string') {
		keyVar = buildVariable(options.key);
	} else {
		keyVar = options.key;
	}

	const valueVar =
		typeof options.value === 'string'
			? buildVariable(options.value)
			: options.value;

	return buildForeach(options.iterable, {
		valueVar,
		keyVar,
		byRef: options.byRef ?? false,
		stmts: [...options.statements],
	});
}
