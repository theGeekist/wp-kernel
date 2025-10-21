import { KernelError } from '@wpkernel/core/contracts';
import {
	createArray,
	createArrayDimFetch,
	createAssign,
	createIdentifier,
	createInstanceof,
	createName,
	createNode,
	createExpressionStatement,
	createPropertyFetch,
	createVariable,
	type PhpExpr,
	type PhpExprBase,
	type PhpExprBinaryOp,
	type PhpExprBooleanNot,
	type PhpStmt,
	type PhpStmtIf,
} from '../../ast/nodes';
import { createPrintable, type PhpPrintable } from '../../ast/printables';
import { PHP_INDENT } from '../../ast/templates';

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

type CastNodeType =
	| 'Expr_Cast_Int'
	| 'Expr_Cast_Double'
	| 'Expr_Cast_String'
	| 'Expr_Cast_Bool';

const CAST_NODE_MAP: Record<ScalarCastKind, CastNodeType> = {
	int: 'Expr_Cast_Int',
	float: 'Expr_Cast_Double',
	string: 'Expr_Cast_String',
	bool: 'Expr_Cast_Bool',
};

interface PhpExprCast extends PhpExprBase {
	readonly expr: PhpExpr;
}

export function buildScalarCast(kind: ScalarCastKind, expr: PhpExpr): PhpExpr {
	const nodeType = CAST_NODE_MAP[kind];
	return createNode<PhpExprCast>(nodeType, { expr }) as PhpExpr;
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
	return createNode<PhpExprBinaryOp>(nodeType, { left, right });
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

	const node = createNode<PhpStmtIf>('Stmt_If', {
		cond: options.condition,
		stmts,
		elseifs: [],
		else: null,
	});

	return createPrintable(node, lines);
}

export function buildArrayDimFetch(
	target: string,
	dim: PhpExpr | null
): PhpExpr {
	return createArrayDimFetch(createVariable(target), dim);
}

export function buildPropertyFetch(target: string, property: string): PhpExpr {
	return createPropertyFetch(
		createVariable(target),
		createIdentifier(property)
	);
}

export function buildInstanceof(subject: string, className: string): PhpExpr {
	return createInstanceof(createVariable(subject), createName([className]));
}

export function buildBooleanNot(expr: PhpExpr): PhpExprBooleanNot {
	return createNode<PhpExprBooleanNot>('Expr_BooleanNot', { expr });
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

	return createPrintable(
		createExpressionStatement(
			createAssign(createVariable(reference.raw), createArray([]))
		),
		[`${indent}${reference.display} = [];`]
	);
}
