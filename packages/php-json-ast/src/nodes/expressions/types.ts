import { type PhpArg } from '../arguments';
import { type PhpAttrGroup } from '../attributes';
import { type PhpNode } from '../base';
import { type PhpIdentifier } from '../identifier';
import { type PhpName } from '../name';
import { type PhpParam } from '../params';
import { type PhpScalar } from '../scalar';
import { type PhpStmt } from '../stmt';
import { type PhpType } from '../types';

/**
 * Represents the node type for PHP expressions.
 *
 * @category PHP AST
 */
export type PhpExprNodeType = `Expr_${string}` | 'ArrayItem';

/**
 * Base interface for all PHP expression nodes.
 *
 * @category PHP AST
 */
export interface PhpExprBase extends PhpNode {
	readonly nodeType: PhpExprNodeType;
}

/**
 * Represents a PHP assignment expression (e.g., `$var = $value`).
 *
 * @category PHP AST
 */
export interface PhpExprAssign extends PhpExprBase {
	readonly nodeType: 'Expr_Assign';
	readonly var: PhpExpr;
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP array expression (e.g., `[1, 2, 3]` or `array(1, 2, 3)`).
 *
 * @category PHP AST
 */
export interface PhpExprArray extends PhpExprBase {
	readonly nodeType: 'Expr_Array';
	readonly items: PhpExprArrayItem[];
}

/**
 * Represents an item within a PHP array expression.
 *
 * @category PHP AST
 */
export interface PhpExprArrayItem extends PhpExprBase {
	readonly nodeType: 'ArrayItem';
	readonly key: PhpExpr | null;
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
}

/**
 * Represents a PHP array dimension fetch expression (e.g., `$array[key]`).
 *
 * @category PHP AST
 */
export interface PhpExprArrayDimFetch extends PhpExprBase {
	readonly nodeType: 'Expr_ArrayDimFetch';
	readonly var: PhpExpr;
	readonly dim: PhpExpr | null;
}

/**
 * Represents a PHP variable expression (e.g., `$foo`).
 *
 * @category PHP AST
 */
export interface PhpExprVariable extends PhpExprBase {
	readonly nodeType: 'Expr_Variable';
	readonly name: string | PhpExpr;
}

/**
 * Represents a PHP method call expression (e.g., `$object->method()`).
 *
 * @category PHP AST
 */
export interface PhpExprMethodCall extends PhpExprBase {
	readonly nodeType: 'Expr_MethodCall';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

/**
 * Represents a PHP nullsafe method call expression (e.g., `$object?->method()`).
 *
 * @category PHP AST
 */
export interface PhpExprNullsafeMethodCall extends PhpExprBase {
	readonly nodeType: 'Expr_NullsafeMethodCall';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

/**
 * Represents a PHP static method call expression (e.g., `MyClass::staticMethod()`).
 *
 * @category PHP AST
 */
export interface PhpExprStaticCall extends PhpExprBase {
	readonly nodeType: 'Expr_StaticCall';
	readonly class: PhpName | PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
	readonly args: PhpArg[];
}

/**
 * Represents a PHP function call expression (e.g., `myFunction()`).
 *
 * @category PHP AST
 */
export interface PhpExprFuncCall extends PhpExprBase {
	readonly nodeType: 'Expr_FuncCall';
	readonly name: PhpName | PhpExpr;
	readonly args: PhpArg[];
}

/**
 * Represents a PHP `new` expression (e.g., `new MyClass()`).
 *
 * @category PHP AST
 */
export interface PhpExprNew extends PhpExprBase {
	readonly nodeType: 'Expr_New';
	readonly class: PhpName | PhpExpr;
	readonly args: PhpArg[];
}

/**
 * Represents a PHP constant fetch expression (e.g., `MY_CONST`).
 *
 * @category PHP AST
 */
export interface PhpExprConstFetch extends PhpExprBase {
	readonly nodeType: 'Expr_ConstFetch';
	readonly name: PhpName;
}

/**
 * Represents a PHP boolean NOT expression (e.g., `!$foo`).
 *
 * @category PHP AST
 */
export interface PhpExprBooleanNot extends PhpExprBase {
	readonly nodeType: 'Expr_BooleanNot';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP `instanceof` expression (e.g., `$object instanceof MyClass`).
 *
 * @category PHP AST
 */
export interface PhpExprInstanceof extends PhpExprBase {
	readonly nodeType: 'Expr_Instanceof';
	readonly expr: PhpExpr;
	readonly class: PhpName | PhpExpr;
}

/**
 * Represents a PHP binary operation expression (e.g., `$a + $b`).
 *
 * @category PHP AST
 */
export interface PhpExprBinaryOp extends PhpExprBase {
	readonly nodeType: `Expr_BinaryOp_${string}`;
	readonly left: PhpExpr;
	readonly right: PhpExpr;
}

/**
 * Represents a PHP ternary expression (e.g., `$a ? $b : $c`).
 *
 * @category PHP AST
 */
export interface PhpExprTernary extends PhpExprBase {
	readonly nodeType: 'Expr_Ternary';
	readonly cond: PhpExpr;
	readonly if: PhpExpr | null;
	readonly else: PhpExpr;
}

/**
 * Represents a PHP nullsafe property fetch expression (e.g., `$object?->property`).
 *
 * @category PHP AST
 */
export interface PhpExprNullsafePropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_NullsafePropertyFetch';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

/**
 * Represents a PHP property fetch expression (e.g., `$object->property`).
 *
 * @category PHP AST
 */
export interface PhpExprPropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_PropertyFetch';
	readonly var: PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

/**
 * Represents a PHP static property fetch expression (e.g., `MyClass::$property`).
 *
 * @category PHP AST
 */
export interface PhpExprStaticPropertyFetch extends PhpExprBase {
	readonly nodeType: 'Expr_StaticPropertyFetch';
	readonly class: PhpName | PhpExpr;
	readonly name: PhpIdentifier | PhpExpr;
}

/**
 * Represents a PHP null coalescing operator expression (e.g., `$a ?? $b`).
 *
 * @category PHP AST
 */
export interface PhpExprCoalesce extends PhpExprBase {
	readonly nodeType: 'Expr_BinaryOp_Coalesce';
	readonly left: PhpExpr;
	readonly right: PhpExpr;
}

/**
 * Represents a PHP unary minus expression (e.g., `-$foo`).
 *
 * @category PHP AST
 */
export interface PhpExprUnaryMinus extends PhpExprBase {
	readonly nodeType: 'Expr_UnaryMinus';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP unary plus expression (e.g., `+$foo`).
 *
 * @category PHP AST
 */
export interface PhpExprUnaryPlus extends PhpExprBase {
	readonly nodeType: 'Expr_UnaryPlus';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP `clone` expression (e.g., `clone $object`).
 *
 * @category PHP AST
 */
export interface PhpExprClone extends PhpExprBase {
	readonly nodeType: 'Expr_Clone';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP array cast expression (e.g., `(array) $var`).
 *
 * @category PHP AST
 */
export interface PhpExprCastArray extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Array';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP integer cast expression (e.g., `(int) $var`).
 *
 * @category PHP AST
 */
export interface PhpExprCastInt extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Int';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP float cast expression (e.g., `(float) $var`).
 *
 * @category PHP AST
 */
export interface PhpExprCastDouble extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Double';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP string cast expression (e.g., `(string) $var`).
 *
 * @category PHP AST
 */
export interface PhpExprCastString extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_String';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP boolean cast expression (e.g., `(bool) $var`).
 *
 * @category PHP AST
 */
export interface PhpExprCastBool extends PhpExprBase {
	readonly nodeType: 'Expr_Cast_Bool';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP `use` statement in a closure (e.g., `function () use ($var)`).
 *
 * @category PHP AST
 */
export interface PhpClosureUse extends PhpNode {
	readonly nodeType: 'ClosureUse' | 'Expr_ClosureUse';
	readonly var: PhpExprVariable;
	readonly byRef: boolean;
}

/**
 * Represents a single arm in a PHP `match` expression.
 *
 * @category PHP AST
 */
export interface PhpMatchArm extends PhpNode {
	readonly nodeType: 'MatchArm';
	readonly conds: PhpExpr[] | null;
	readonly body: PhpExpr;
}

/**
 * Represents a PHP closure expression (anonymous function).
 *
 * @category PHP AST
 */
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

/**
 * Represents a PHP arrow function expression (e.g., `fn($x) => $x * 2`).
 *
 * @category PHP AST
 */
export interface PhpExprArrowFunction extends PhpExprBase {
	readonly nodeType: 'Expr_ArrowFunction';
	readonly static: boolean;
	readonly byRef: boolean;
	readonly params: PhpParam[];
	readonly returnType: PhpType | null;
	readonly expr: PhpExpr;
	readonly attrGroups: PhpAttrGroup[];
}

/**
 * Represents a PHP `match` expression.
 *
 * @category PHP AST
 */
export interface PhpExprMatch extends PhpExprBase {
	readonly nodeType: 'Expr_Match';
	readonly cond: PhpExpr;
	readonly arms: PhpMatchArm[];
}

/**
 * Represents a PHP `throw` expression.
 *
 * @category PHP AST
 */
export interface PhpExprThrow extends PhpExprBase {
	readonly nodeType: 'Expr_Throw';
	readonly expr: PhpExpr;
}

/**
 * Represents any PHP expression node.
 *
 * @category PHP AST
 */
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

/**
 * Represents any PHP scalar cast expression.
 *
 * @category PHP AST
 */
export type PhpExprCastScalar =
	| PhpExprCastInt
	| PhpExprCastDouble
	| PhpExprCastString
	| PhpExprCastBool;
