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
	type PhpExpr,
	type PhpExprBinaryOp,
	type PhpExprBooleanNot,
	type PhpStmt,
	type PhpStmtIf,
	buildPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';

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

export function indentLines(
	lines: readonly string[],
	indent: string
): string[] {
	const prefix = indent ?? '';
	if (prefix.length === 0) {
		return [...lines];
	}

	return lines.map((line) => (line === '' ? '' : `${prefix}${line}`));
}

export interface IfPrintableOptions {
	readonly indentLevel: number;
	readonly condition: PhpExpr;
	readonly conditionText: string;
	readonly statements: readonly PhpPrintable<PhpStmt>[];
}

export function buildIfPrintable(
	options: IfPrintableOptions
): PhpPrintable<PhpStmtIf> {
	const indent = PHP_INDENT.repeat(options.indentLevel);
	const lines = [options.conditionText];
	const stmts: PhpStmt[] = [];

	for (const statement of options.statements) {
		lines.push(...statement.lines);
		stmts.push(statement.node);
	}

	lines.push(`${indent}}`);

	const node = buildIfStatement(options.condition, stmts);

	return buildPrintable(node, lines);
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

export interface ArrayInitialiserOptions {
	readonly variable: string;
	readonly indentLevel: number;
}

export function buildArrayInitialiser(
	options: ArrayInitialiserOptions
): PhpPrintable<PhpStmt> {
	const reference = normaliseVariableReference(options.variable);
	const indent = PHP_INDENT.repeat(options.indentLevel);

	return buildPrintable(
		buildExpressionStatement(
			buildAssign(buildVariable(reference.raw), buildArray([]))
		),
		[`${indent}${reference.display} = [];`]
	);
}
