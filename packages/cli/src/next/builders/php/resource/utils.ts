import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArray,
	buildArrayCast,
	buildArrayDimFetch as buildArrayDimFetchNode,
	buildArrayItem,
	buildAssign,
	buildBooleanNot as buildBooleanNotExpr,
	buildExpressionStatement,
	buildIdentifier,
	buildIfStatement,
	buildInstanceof as buildInstanceofExpr,
	buildName,
	buildNode,
	buildPropertyFetch as buildPropertyFetchNode,
	buildReturn,
	buildScalarCast as buildScalarCastNode,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpExprBinaryOp,
	type PhpExprBooleanNot,
	type PhpStmt,
	type PhpStmtExpression,
	type PhpStmtForeach,
	type PhpStmtIf,
	type PhpStmtReturn,
} from '@wpkernel/php-json-ast';

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

export type ScalarCastKind = 'int' | 'float' | 'string' | 'bool' | 'array';

export function buildScalarCast(kind: ScalarCastKind, expr: PhpExpr): PhpExpr {
	if (kind === 'array') {
		return buildArrayCast(expr);
	}

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

// ─────────────────────────────────────────────
// Both legacy + new paths preserved below
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────

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

	return buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: options.iterable,
		valueVar,
		keyVar,
		byRef: options.byRef ?? false,
		stmts: [...options.statements],
	});
}
