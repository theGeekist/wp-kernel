import { buildNode, type PhpAttributes } from '../base';
import type { PhpArg } from '../arguments';
import type { PhpAttrGroup } from '../attributes';
import type { PhpIdentifier } from '../identifier';
import { buildName, type PhpName } from '../name';
import type { PhpParam } from '../params';
import type { PhpStmt } from '../stmt';
import type { PhpType } from '../types';
import type {
	PhpExprArrayItem,
	PhpExprArray,
	PhpExpr,
	PhpExprConstFetch,
	PhpExprVariable,
	PhpExprAssign,
	PhpExprArrayDimFetch,
	PhpExprMethodCall,
	PhpExprNullsafeMethodCall,
	PhpExprStaticCall,
	PhpExprFuncCall,
	PhpExprNew,
	PhpExprPropertyFetch,
	PhpExprNullsafePropertyFetch,
	PhpExprBooleanNot,
	PhpExprBinaryOp,
	PhpExprInstanceof,
	PhpExprCastArray,
	PhpExprCastScalar,
	PhpClosureUse,
	PhpExprClosure,
	PhpExprArrowFunction,
	PhpExprTernary,
	PhpMatchArm,
	PhpExprMatch,
	PhpExprThrow,
} from './types';

/**
 * Builds a PHP array expression node.
 *
 * @category PHP AST
 * @param    items      - An array of `PhpExprArrayItem` nodes.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprArray` node.
 */
export function buildArray(
	items: PhpExprArrayItem[],
	attributes?: PhpAttributes
): PhpExprArray {
	return buildNode<PhpExprArray>('Expr_Array', { items }, attributes);
}

/**
 * Builds a PHP array item node.
 *
 * @category PHP AST
 * @param    value          - The expression representing the item's value.
 * @param    options        - Optional configuration for the array item (key, by reference, unpack).
 * @param    options.key
 * @param    options.byRef
 * @param    options.unpack
 * @param    attributes     - Optional attributes for the node.
 * @returns A `PhpExprArrayItem` node.
 */
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

/**
 * Builds a PHP boolean scalar expression (represented as a `ConstFetch` of `true` or `false`).
 *
 * @category PHP AST
 * @param    value      - The boolean value.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprConstFetch` node representing the boolean scalar.
 */
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

/**
 * Builds a PHP `null` constant fetch expression.
 *
 * @category PHP AST
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprConstFetch` node representing `null`.
 */
export function buildNull(attributes?: PhpAttributes): PhpExprConstFetch {
	return buildNode<PhpExprConstFetch>(
		'Expr_ConstFetch',
		{
			name: buildName(['null']),
		},
		attributes
	);
}

/**
 * Builds a PHP variable expression node.
 *
 * @category PHP AST
 * @param    name       - The name of the variable, either a string or a `PhpExpr` for dynamic variable names.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprVariable` node.
 */
export function buildVariable(
	name: string | PhpExpr,
	attributes?: PhpAttributes
): PhpExprVariable {
	return buildNode<PhpExprVariable>('Expr_Variable', { name }, attributes);
}

/**
 * Builds a PHP assignment expression node.
 *
 * @category PHP AST
 * @param    variable   - The variable being assigned to.
 * @param    expr       - The expression whose value is being assigned.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprAssign` node.
 */
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

/**
 * Builds a PHP array dimension fetch expression node.
 *
 * @category PHP AST
 * @param    variable   - The array variable.
 * @param    dim        - The dimension (key) being accessed, or `null` for appending.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprArrayDimFetch` node.
 */
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

/**
 * Builds a PHP method call expression node.
 *
 * @category PHP AST
 * @param    variable   - The variable or expression representing the object.
 * @param    name       - The name of the method, either an identifier or an expression.
 * @param    args       - An array of `PhpArg` nodes representing the method arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprMethodCall` node.
 */
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

/**
 * Builds a PHP nullsafe method call expression node.
 *
 * @category PHP AST
 * @param    variable   - The variable or expression representing the object.
 * @param    name       - The name of the method, either an identifier or an expression.
 * @param    args       - An array of `PhpArg` nodes representing the method arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprNullsafeMethodCall` node.
 */
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

/**
 * Builds a PHP static method call expression node.
 *
 * @category PHP AST
 * @param    className  - The name of the class, either a `PhpName` or an expression.
 * @param    name       - The name of the static method, either an identifier or an expression.
 * @param    args       - An array of `PhpArg` nodes representing the method arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprStaticCall` node.
 */
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

/**
 * Builds a PHP function call expression node.
 *
 * @category PHP AST
 * @param    name       - The name of the function, either a `PhpName` or an expression.
 * @param    args       - An array of `PhpArg` nodes representing the function arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprFuncCall` node.
 */
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

/**
 * Builds a PHP `new` expression node.
 *
 * @category PHP AST
 * @param    className  - The name of the class to instantiate, either a `PhpName` or an expression.
 * @param    args       - An array of `PhpArg` nodes representing the constructor arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprNew` node.
 */
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

/**
 * Builds a PHP property fetch expression node.
 *
 * @category PHP AST
 * @param    variable   - The variable or expression representing the object.
 * @param    name       - The name of the property, either an identifier or an expression.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprPropertyFetch` node.
 */
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

/**
 * Builds a PHP nullsafe property fetch expression node.
 *
 * @category PHP AST
 * @param    variable   - The variable or expression representing the object.
 * @param    name       - The name of the property, either an identifier or an expression.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprNullsafePropertyFetch` node.
 */
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

/**
 * Builds a PHP boolean NOT expression node.
 *
 * @category PHP AST
 * @param    expr       - The expression to negate.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprBooleanNot` node.
 */
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

/**
 * Represents the type of a PHP binary operator.
 *
 * @category PHP AST
 */
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
	| 'NotIdentical'
	| 'Concat';

/**
 * Builds a PHP binary operation expression node.
 *
 * @category PHP AST
 * @param    operator   - The binary operator (e.g., 'Plus', 'BooleanAnd').
 * @param    left       - The left-hand side expression.
 * @param    right      - The right-hand side expression.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprBinaryOp` node.
 */
export function buildBinaryOperation(
	operator: PhpBinaryOperator,
	left: PhpExpr,
	right: PhpExpr,
	attributes?: PhpAttributes
): PhpExprBinaryOp {
	const nodeType = `Expr_BinaryOp_${operator}` as PhpExprBinaryOp['nodeType'];
	return buildNode<PhpExprBinaryOp>(nodeType, { left, right }, attributes);
}

/**
 * Builds a PHP `instanceof` expression node.
 *
 * @category PHP AST
 * @param    expr       - The expression to check.
 * @param    className  - The class name to check against, either a `PhpName` or an expression.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprInstanceof` node.
 */
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

/**
 * Builds a PHP array cast expression node.
 *
 * @category PHP AST
 * @param    expr       - The expression to cast to an array.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprCastArray` node.
 */
export function buildArrayCast(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprCastArray {
	return buildNode<PhpExprCastArray>('Expr_Cast_Array', { expr }, attributes);
}

/**
 * Builds a PHP scalar cast expression node (int, float, string, bool).
 *
 * @category PHP AST
 * @param    kind       - The type to cast to ('int', 'float', 'string', or 'bool').
 * @param    expr       - The expression to cast.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprCastScalar` node.
 */
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

/**
 * Builds a PHP closure use node.
 *
 * @category PHP AST
 * @param    variable      - The variable being used in the closure.
 * @param    options       - Optional configuration for the use (by reference).
 * @param    options.byRef
 * @param    attributes    - Optional attributes for the node.
 * @returns A `PhpClosureUse` node.
 */
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

/**
 * Builds a PHP closure expression node.
 *
 * @category PHP AST
 * @param    options            - Optional configuration for the closure (static, by reference, parameters, uses, return type, statements, attribute groups).
 * @param    options.static
 * @param    options.byRef
 * @param    options.params
 * @param    options.uses
 * @param    options.returnType
 * @param    options.stmts
 * @param    options.attrGroups
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpExprClosure` node.
 */
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

/**
 * Builds a PHP arrow function expression node.
 *
 * @category PHP AST
 * @param    options            - Configuration for the arrow function (static, by reference, parameters, return type, expression body, attribute groups).
 * @param    options.static
 * @param    options.byRef
 * @param    options.params
 * @param    options.returnType
 * @param    options.expr
 * @param    options.attrGroups
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpExprArrowFunction` node.
 */
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

/**
 * Builds a PHP ternary expression node.
 *
 * @category PHP AST
 * @param    cond       - The conditional expression.
 * @param    ifExpr     - The expression to evaluate if the condition is true (can be `null` for shorthand ternary).
 * @param    elseExpr   - The expression to evaluate if the condition is false.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprTernary` node.
 */
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

/**
 * Builds a PHP match arm node.
 *
 * @category PHP AST
 * @param    conds      - An array of expressions representing the conditions for this arm, or `null` for the default arm.
 * @param    body       - The expression to execute if the conditions match.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpMatchArm` node.
 */
export function buildMatchArm(
	conds: PhpExpr[] | null,
	body: PhpExpr,
	attributes?: PhpAttributes
): PhpMatchArm {
	return buildNode<PhpMatchArm>('MatchArm', { conds, body }, attributes);
}

/**
 * Builds a PHP `match` expression node.
 *
 * @category PHP AST
 * @param    cond       - The expression to match against.
 * @param    arms       - An array of `PhpMatchArm` nodes.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprMatch` node.
 */
export function buildMatch(
	cond: PhpExpr,
	arms: PhpMatchArm[],
	attributes?: PhpAttributes
): PhpExprMatch {
	return buildNode<PhpExprMatch>('Expr_Match', { cond, arms }, attributes);
}

/**
 * Builds a PHP `throw` expression node.
 *
 * @category PHP AST
 * @param    expr       - The expression representing the throwable object.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpExprThrow` node.
 */
export function buildThrow(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprThrow {
	return buildNode<PhpExprThrow>('Expr_Throw', { expr }, attributes);
}

export * from './types';
