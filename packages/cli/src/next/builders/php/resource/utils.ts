import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArray,
	buildArrayDimFetch as buildArrayDimFetchNode,
	buildAssign,
	buildBooleanNot as buildBooleanNotExpr,
	buildIdentifier,
	buildIfStatement,
	buildInstanceof as buildInstanceofExpr,
	buildName,
	buildNode,
	buildExpressionStatement,
	buildPropertyFetch as buildPropertyFetchNode,
	buildScalarCast as buildScalarCastNode,
	buildVariable,
	PHP_INDENT,
	type PhpExpr,
	type PhpExprBinaryOp,
	type PhpExprBooleanNot,
	type PhpStmt,
	type PhpStmtExpression,
	type PhpStmtIf,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from './printer';

export interface NormalisedVariableReference {
	readonly raw: string;
	readonly display: string;
}

export function normaliseVariableReference(
	name: string
): NormalisedVariableReference {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new KernelError('DeveloperError', {
			message: 'Variable name must not be empty.',
			context: { name },
		});
	}

	if (trimmed.startsWith('$')) {
		const raw = trimmed.slice(1);
		if (!raw) {
			throw new KernelError('DeveloperError', {
				message: 'Variable name must include an identifier.',
				context: { name },
			});
		}

		return { raw, display: trimmed };
	}

	return { raw: trimmed, display: `$${trimmed}` };
}

export type ScalarCastKind = 'int' | 'float' | 'string' | 'bool';

export function buildScalarCast(kind: ScalarCastKind, expr: PhpExpr): PhpExpr {
	return buildScalarCastNode(kind, expr);
}

export type BinaryOperator =
	| 'Plus'
	| 'Minus'
	| 'Mul'
	| 'Div'
	| 'Mod'
	| 'BooleanAnd'
	| 'BooleanOr'
	| 'Smaller'
	| 'SmallerOrEqual'
	| 'Greater'
	| 'GreaterOrEqual'
	| 'Equal'
	| 'NotEqual'
	| 'Identical'
	| 'NotIdentical';

export function buildBinaryOperation(
	operator: BinaryOperator,
	left: PhpExpr,
	right: PhpExpr
): PhpExprBinaryOp {
	const nodeType = `Expr_BinaryOp_${operator}` as PhpExprBinaryOp['nodeType'];
	return buildNode<PhpExprBinaryOp>(nodeType, { left, right });
}

export interface IfPrintableOptions {
	readonly indentLevel: number;
	readonly condition: PhpExpr;
	readonly statements: readonly PhpPrintable<PhpStmt>[];
}

export function printStatement<T extends PhpStmt>(
	statement: T,
	indentLevel: number,
	indentUnit: string = PHP_INDENT
): PhpPrintable<T> {
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit,
	});
}

export function buildIfPrintable(
	options: IfPrintableOptions
): PhpPrintable<PhpStmtIf> {
	const stmts: PhpStmt[] = options.statements.map(
		(statement) => statement.node
	);
	const node = buildIfStatement(options.condition, stmts);
	return printStatement(node, options.indentLevel);
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

export function buildVariableAssignment(
	target: NormalisedVariableReference,
	expression: PhpExpr
): PhpStmtExpression {
	return buildExpressionStatement(
		buildAssign(buildVariable(target.raw), expression)
	);
}

export interface ArrayInitialiserOptions {
	readonly variable: string;
	readonly indentLevel: number;
}

export function buildArrayInitialiser(
	options: ArrayInitialiserOptions
): PhpPrintable<PhpStmt> {
	const statement = buildVariableAssignment(
		normaliseVariableReference(options.variable),
		buildArray([])
	);

	return printStatement(statement, options.indentLevel);
}
