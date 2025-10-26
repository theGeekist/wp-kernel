import { buildNode, type PhpAttributes, type PhpNode } from '../base';
import type { PhpArg } from '../arguments';
import type { PhpAttrGroup } from '../attributes';
import type { PhpIdentifier } from '../identifier';
import { buildName, type PhpName } from '../name';
import type { PhpParam } from '../params';
import type { PhpScalar } from '../scalar';
import type { PhpStmt } from '../stmt';
import type { PhpType } from '../types';

export interface PhpExprBase extends PhpNode {
	readonly nodeType: `Expr_${string}` | 'ArrayItem';
}

export interface PhpExprAssign extends PhpExprBase {
	readonly nodeType: 'Expr_Assign';
	readonly var: PhpExpr;
	readonly expr: PhpExpr;
}

export interface PhpExprArray extends PhpExprBase {
	readonly nodeType: 'Expr_Array';
	readonly items: PhpExprArrayItem[];
}

export interface PhpExprArrayItem extends PhpExprBase {
	readonly nodeType: 'ArrayItem';
	readonly key: PhpExpr | null;
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
}

export interface PhpExprArrayDimFetch extends PhpExprBase {
	readonly nodeType: 'Expr_ArrayDimFetch';
	readonly var: PhpExpr;
	readonly dim: PhpExpr | null;
}

export interface PhpExprVariable extends PhpExprBase {
	readonly nodeType: 'Expr_Variable';
	readonly name: string | PhpExpr;
}

export interface PhpExprMethodCall extends PhpExprBase {
	readonly nodeType: 'Expr_MethodCall';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

export interface PhpExprNullsafeMethodCall extends PhpExprBase {
	readonly nodeType: 'Expr_NullsafeMethodCall';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

export interface PhpExprStaticCall extends PhpExprBase {
	readonly nodeType: 'Expr_StaticCall';
	readonly class: PhpName | PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

export interface PhpExprFuncCall extends PhpExprBase {
	readonly nodeType: 'Expr_FuncCall';
	readonly name: PhpName | PhpExpr;
	readonly args: PhpArg[];
}

export interface PhpExprNew extends PhpExprBase {
	readonly nodeType: 'Expr_New';
	readonly class: PhpName | PhpExpr;
	readonly args: PhpArg[];
}

export interface PhpExprConstFetch extends PhpExprBase {
	readonly nodeType: 'Expr_ConstFetch';
	readonly name: PhpName;
}

export interface PhpExprBooleanNot extends PhpExprBase {
	readonly nodeType: 'Expr_BooleanNot';
	readonly expr: PhpExpr;
}

export interface PhpExprInstanceof extends PhpExprBase {
	readonly nodeType: 'Expr_Instanceof';
	readonly expr: PhpExpr;
	readonly class: PhpName | PhpExpr;
}

export interface PhpExprBinaryOp extends PhpExprBase {
	readonly nodeType: `Expr_BinaryOp_${string}`;
	readonly left: PhpExpr;
	readonly right: PhpExpr;
}

export interface PhpExprTernary extends PhpExprBase {
	readonly nodeType: 'Expr_Ternary';
	readonly cond: PhpExpr;
	readonly if: PhpExpr | null;
	readonly else: PhpExpr;
}

export interface PhpExprNullsafePropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_NullsafePropertyFetch';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

export interface PhpExprPropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_PropertyFetch';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

export interface PhpExprStaticPropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_StaticPropertyFetch';
	readonly class: PhpName | PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

export interface PhpExprCoalesce extends PhpExprBase {
	readonly nodeType: 'Expr_BinaryOp_Coalesce';
	readonly left: PhpExpr;
	readonly right: PhpExpr;
}

export interface PhpExprUnaryMinus extends PhpExprBase {
	readonly nodeType: 'Expr_UnaryMinus';
	readonly expr: PhpExpr;
}

export interface PhpExprUnaryPlus extends PhpExprBase {
	readonly nodeType: 'Expr_UnaryPlus';
	readonly expr: PhpExpr;
}

export interface PhpExprClone extends PhpExprBase {
	readonly nodeType: 'Expr_Clone';
	readonly expr: PhpExpr;
}

export interface PhpExprCastArray extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Array';
	readonly expr: PhpExpr;
}

export interface PhpExprCastInt extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Int';
	readonly expr: PhpExpr;
}

export interface PhpExprCastDouble extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Double';
	readonly expr: PhpExpr;
}

export interface PhpExprCastString extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_String';
	readonly expr: PhpExpr;
}

export interface PhpExprCastBool extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Bool';
	readonly expr: PhpExpr;
}

export interface PhpClosureUse extends PhpNode {
	readonly nodeType: 'ClosureUse' | 'Expr_ClosureUse';
	readonly var: PhpExprVariable;
	readonly byRef: boolean;
}

export interface PhpMatchArm extends PhpNode {
	readonly nodeType: 'MatchArm';
	readonly conds: PhpExpr[] | null;
	readonly body: PhpExpr;
}

export interface PhpExprClosure extends PhpExprBase {
	readonly nodeType: 'Expr_Closure';
	readonly static: boolean;
	readonly byRef: boolean;
	readonly params: PhpParam[];
	readonly uses: PhpClosureUse[];
	readonly returnType: PhpType | null;
	readonly stmts: PhpStmt[];
	readonly attrGroups: PhpAttrGroup[];
}

export interface PhpExprArrowFunction extends PhpExprBase {
	readonly nodeType: 'Expr_ArrowFunction';
	readonly static: boolean;
	readonly byRef: boolean;
	readonly params: PhpParam[];
	readonly returnType: PhpType | null;
	readonly expr: PhpExpr;
	readonly attrGroups: PhpAttrGroup[];
}

export interface PhpExprMatch extends PhpExprBase {
	readonly nodeType: 'Expr_Match';
	readonly cond: PhpExpr;
	readonly arms: PhpMatchArm[];
}

export interface PhpExprThrow extends PhpExprBase {
	readonly nodeType: 'Expr_Throw';
	readonly expr: PhpExpr;
}

export type PhpExpr =
	| PhpExprAssign
	| PhpExprArray
	| PhpExprArrayItem
	| PhpExprArrayDimFetch
	| PhpExprVariable
	| PhpExprMethodCall
	| PhpExprNullsafeMethodCall
	| PhpExprStaticCall
	| PhpExprFuncCall
	| PhpExprNew
	| PhpExprConstFetch
	| PhpExprBooleanNot
	| PhpExprInstanceof
	| PhpExprBinaryOp
	| PhpExprTernary
	| PhpExprNullsafePropertyFetch
	| PhpExprPropertyFetch
	| PhpExprStaticPropertyFetch
	| PhpExprCoalesce
	| PhpExprUnaryMinus
	| PhpExprUnaryPlus
	| PhpExprClone
	| PhpExprCastArray
	| PhpExprCastScalar
	| PhpExprMatch
	| PhpExprArrowFunction
	| PhpExprThrow
	| PhpExprClosure
	| PhpScalar
	| PhpExprBase;

export type PhpExprCastScalar =
	| PhpExprCastInt
	| PhpExprCastDouble
	| PhpExprCastString
	| PhpExprCastBool;

export function buildArray(
	items: PhpExprArrayItem[],
	attributes?: PhpAttributes
): PhpExprArray {
	return buildNode<PhpExprArray>('Expr_Array', { items }, attributes);
}

export function buildArrayItem(
	value: PhpExpr,
	options: {
		key?: PhpExpr | null;
		byRef?: boolean;
		unpack?: boolean;
	} = {},
	attributes?: PhpAttributes
): PhpExprArrayItem {
	return buildNode<PhpExprArrayItem>(
		'ArrayItem',
		{
			key: options.key ?? null,
			value,
			byRef: options.byRef ?? false,
			unpack: options.unpack ?? false,
		},
		attributes
	);
}

export function buildScalarBool(
	value: boolean,
	attributes?: PhpAttributes
): PhpExprConstFetch {
	return buildNode<PhpExprConstFetch>(
		'Expr_ConstFetch',
		{
			name: buildName(value ? ['true'] : ['false']),
		},
		attributes
	);
}

export function buildNull(attributes?: PhpAttributes): PhpExprConstFetch {
	return buildNode<PhpExprConstFetch>(
		'Expr_ConstFetch',
		{
			name: buildName(['null']),
		},
		attributes
	);
}

export function buildVariable(
	name: string | PhpExpr,
	attributes?: PhpAttributes
): PhpExprVariable {
	return buildNode<PhpExprVariable>('Expr_Variable', { name }, attributes);
}

export function buildAssign(
	variable: PhpExpr,
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprAssign {
	return buildNode<PhpExprAssign>(
		'Expr_Assign',
		{ var: variable, expr },
		attributes
	);
}

export function buildArrayDimFetch(
	variable: PhpExpr,
	dim: PhpExpr | null,
	attributes?: PhpAttributes
): PhpExprArrayDimFetch {
	return buildNode<PhpExprArrayDimFetch>(
		'Expr_ArrayDimFetch',
		{ var: variable, dim },
		attributes
	);
}

export function buildMethodCall(
	variable: PhpExpr,
	name: PhpIdentifier | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprMethodCall {
	return buildNode<PhpExprMethodCall>(
		'Expr_MethodCall',
		{ var: variable, name, args },
		attributes
	);
}

export function buildNullsafeMethodCall(
	variable: PhpExpr,
	name: PhpIdentifier | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprNullsafeMethodCall {
	return buildNode<PhpExprNullsafeMethodCall>(
		'Expr_NullsafeMethodCall',
		{ var: variable, name, args },
		attributes
	);
}

export function buildStaticCall(
	className: PhpName | PhpExpr,
	name: PhpIdentifier | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprStaticCall {
	return buildNode<PhpExprStaticCall>(
		'Expr_StaticCall',
		{ class: className, name, args },
		attributes
	);
}

export function buildFuncCall(
	name: PhpName | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprFuncCall {
	return buildNode<PhpExprFuncCall>(
		'Expr_FuncCall',
		{ name, args },
		attributes
	);
}

export function buildNew(
	className: PhpName | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprNew {
	return buildNode<PhpExprNew>(
		'Expr_New',
		{ class: className, args },
		attributes
	);
}

export function buildPropertyFetch(
	variable: PhpExpr,
	name: PhpIdentifier | PhpExpr,
	attributes?: PhpAttributes
): PhpExprPropertyFetch {
	return buildNode<PhpExprPropertyFetch>(
		'Expr_PropertyFetch',
		{ var: variable, name },
		attributes
	);
}

export function buildNullsafePropertyFetch(
	variable: PhpExpr,
	name: PhpIdentifier | PhpExpr,
	attributes?: PhpAttributes
): PhpExprNullsafePropertyFetch {
	return buildNode<PhpExprNullsafePropertyFetch>(
		'Expr_NullsafePropertyFetch',
		{ var: variable, name },
		attributes
	);
}

export function buildBooleanNot(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprBooleanNot {
	return buildNode<PhpExprBooleanNot>(
		'Expr_BooleanNot',
		{ expr },
		attributes
	);
}

export type PhpBinaryOperator =
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
	operator: PhpBinaryOperator,
	left: PhpExpr,
	right: PhpExpr,
	attributes?: PhpAttributes
): PhpExprBinaryOp {
	const nodeType = `Expr_BinaryOp_${operator}` as PhpExprBinaryOp['nodeType'];
	return buildNode<PhpExprBinaryOp>(nodeType, { left, right }, attributes);
}

export function buildInstanceof(
	expr: PhpExpr,
	className: PhpName | PhpExpr,
	attributes?: PhpAttributes
): PhpExprInstanceof {
	return buildNode<PhpExprInstanceof>(
		'Expr_Instanceof',
		{ expr, class: className },
		attributes
	);
}

export function buildArrayCast(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprCastArray {
	return buildNode<PhpExprCastArray>('Expr_Cast_Array', { expr }, attributes);
}

export function buildScalarCast(
	kind: 'int' | 'float' | 'string' | 'bool',
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprCastScalar {
	const nodeType = (
		{
			int: 'Expr_Cast_Int',
			float: 'Expr_Cast_Double',
			string: 'Expr_Cast_String',
			bool: 'Expr_Cast_Bool',
		} satisfies Record<
			'int' | 'float' | 'string' | 'bool',
			PhpExprCastScalar['nodeType']
		>
	)[kind];

	return buildNode<PhpExprCastScalar>(nodeType, { expr }, attributes);
}

export function buildClosureUse(
	variable: PhpExprVariable,
	options: { byRef?: boolean } = {},
	attributes?: PhpAttributes
): PhpClosureUse {
	return buildNode<PhpClosureUse>(
		'ClosureUse',
		{ var: variable, byRef: options.byRef ?? false },
		attributes
	);
}

export function buildClosure(
	options: {
		static?: boolean;
		byRef?: boolean;
		params?: PhpParam[];
		uses?: PhpClosureUse[];
		returnType?: PhpType | null;
		stmts?: PhpStmt[];
		attrGroups?: PhpAttrGroup[];
	} = {},
	attributes?: PhpAttributes
): PhpExprClosure {
	return buildNode<PhpExprClosure>(
		'Expr_Closure',
		{
			static: options.static ?? false,
			byRef: options.byRef ?? false,
			params: options.params ?? [],
			uses: options.uses ?? [],
			returnType: options.returnType ?? null,
			stmts: options.stmts ?? [],
			attrGroups: options.attrGroups ?? [],
		},
		attributes
	);
}

export function buildArrowFunction(
	options: {
		static?: boolean;
		byRef?: boolean;
		params?: PhpParam[];
		returnType?: PhpType | null;
		expr: PhpExpr;
		attrGroups?: PhpAttrGroup[];
	},
	attributes?: PhpAttributes
): PhpExprArrowFunction {
	return buildNode<PhpExprArrowFunction>(
		'Expr_ArrowFunction',
		{
			static: options.static ?? false,
			byRef: options.byRef ?? false,
			params: options.params ?? [],
			returnType: options.returnType ?? null,
			expr: options.expr,
			attrGroups: options.attrGroups ?? [],
		},
		attributes
	);
}

export function buildTernary(
	cond: PhpExpr,
	ifExpr: PhpExpr | null,
	elseExpr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprTernary {
	return buildNode<PhpExprTernary>(
		'Expr_Ternary',
		{ cond, if: ifExpr, else: elseExpr },
		attributes
	);
}

export function buildMatchArm(
	conds: PhpExpr[] | null,
	body: PhpExpr,
	attributes?: PhpAttributes
): PhpMatchArm {
	return buildNode<PhpMatchArm>('MatchArm', { conds, body }, attributes);
}

export function buildMatch(
	cond: PhpExpr,
	arms: PhpMatchArm[],
	attributes?: PhpAttributes
): PhpExprMatch {
	return buildNode<PhpExprMatch>('Expr_Match', { cond, arms }, attributes);
}

export function buildThrow(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprThrow {
	return buildNode<PhpExprThrow>('Expr_Throw', { expr }, attributes);
}
