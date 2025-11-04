import { buildNode, type PhpAttributes } from '../base';
import type { PhpAttrGroup } from '../attributes';
import type { PhpDeclareItem } from '../declareItem';
import type { PhpIdentifier } from '../identifier';
import type { PhpName } from '../name';
import type { PhpParam } from '../params';
import type { PhpType } from '../types';
import type { PhpExpr } from '../expressions';
import type {
	PhpStmt,
	PhpStmtNamespace,
	PhpStmtNop,
	PhpStmtUseUse,
	PhpStmtUse,
	PhpStmtGroupUse,
	PhpClassStmt,
	PhpStmtClass,
	PhpStmtDeclare,
	PhpStmtClassMethod,
	PhpStmtReturn,
	PhpStmtExpression,
	PhpStmtElseIf,
	PhpStmtElse,
	PhpStmtIf,
	PhpStmtForeach,
	PhpStmtContinue,
} from './types';

/**
 * Builds a PHP namespace statement node.
 *
 * @category PHP AST
 * @param    name       - The name of the namespace, or `null` for the global namespace.
 * @param    stmts      - An array of `PhpStmt` nodes within the namespace.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtNamespace` node.
 */
export function buildNamespace(
	name: PhpName | null,
	stmts: PhpStmt[],
	attributes?: PhpAttributes
): PhpStmtNamespace {
	return buildNode<PhpStmtNamespace>(
		'Stmt_Namespace',
		{ name, stmts },
		attributes
	);
}

/**
 * Builds a PHP no-operation statement node.
 *
 * @category PHP AST
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtNop` node.
 */
export function buildStmtNop(attributes?: PhpAttributes): PhpStmtNop {
	return buildNode<PhpStmtNop>('Stmt_Nop', {}, attributes);
}

/**
 * Builds a PHP `use` statement node.
 *
 * @category PHP AST
 * @param    type       - The type of use statement (e.g., `USE_NORMAL`, `USE_FUNCTION`, `USE_CONST`).
 * @param    uses       - An array of `PhpStmtUseUse` nodes representing the used items.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtUse` node.
 */
export function buildUse(
	type: number,
	uses: PhpStmtUseUse[],
	attributes?: PhpAttributes
): PhpStmtUse {
	return buildNode<PhpStmtUse>('Stmt_Use', { type, uses }, attributes);
}

/**
 * Builds a PHP `use` item node.
 *
 * @category PHP AST
 * @param    name               - The name of the item being used.
 * @param    alias              - An optional alias for the item.
 * @param    options.type
 * @param    options.attributes
 * @param    options            - Optional configuration for the use item (type, attributes).
 * @returns A `PhpStmtUseUse` node.
 */
export function buildUseUse(
	name: PhpName,
	alias: PhpIdentifier | null = null,
	options: { type?: number; attributes?: PhpAttributes } = {}
): PhpStmtUseUse {
	const { type = 0, attributes } = options;
	return buildNode<PhpStmtUseUse>(
		'UseItem',
		{ name, alias, type },
		attributes
	);
}

/**
 * Builds a PHP group `use` statement node.
 *
 * @category PHP AST
 * @param    type       - The type of use statement (e.g., `USE_NORMAL`, `USE_FUNCTION`, `USE_CONST`).
 * @param    prefix     - The common prefix for the grouped uses.
 * @param    uses       - An array of `PhpStmtUseUse` nodes within the group.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtGroupUse` node.
 */
export function buildGroupUse(
	type: number,
	prefix: PhpName,
	uses: PhpStmtUseUse[],
	attributes?: PhpAttributes
): PhpStmtGroupUse {
	return buildNode<PhpStmtGroupUse>(
		'Stmt_GroupUse',
		{ type, prefix, uses },
		attributes
	);
}

/**
 * Builds a PHP class declaration statement node.
 *
 * @category PHP AST
 * @param    name                   - The name of the class, or `null` for an anonymous class.
 * @param    options                - Optional configuration for the class (flags, extends, implements, statements, attribute groups, namespaced name).
 * @param    options.flags
 * @param    options.extends
 * @param    options.implements
 * @param    options.stmts
 * @param    options.attrGroups
 * @param    options.namespacedName
 * @param    attributes             - Optional attributes for the node.
 * @returns A `PhpStmtClass` node.
 */
export function buildClass(
	name: PhpIdentifier | null,
	options: {
		flags?: number;
		extends?: PhpName | null;
		implements?: PhpName[];
		stmts?: PhpClassStmt[];
		attrGroups?: PhpAttrGroup[];
		namespacedName?: PhpName | null;
	} = {},
	attributes?: PhpAttributes
): PhpStmtClass {
	return buildNode<PhpStmtClass>(
		'Stmt_Class',
		{
			name,
			flags: options.flags ?? 0,
			extends: options.extends ?? null,
			implements: options.implements ?? [],
			stmts: options.stmts ?? [],
			attrGroups: options.attrGroups ?? [],
			namespacedName: options.namespacedName ?? null,
		},
		attributes
	);
}

/**
 * Builds a PHP `declare` statement node.
 *
 * @category PHP AST
 * @param    declares      - An array of `PhpDeclareItem` nodes.
 * @param    options       - Optional configuration for the declare statement (statements).
 * @param    options.stmts
 * @param    attributes    - Optional attributes for the node.
 * @returns A `PhpStmtDeclare` node.
 */
export function buildDeclare(
	declares: PhpDeclareItem[],
	options: { stmts?: PhpStmt[] | null } = {},
	attributes?: PhpAttributes
): PhpStmtDeclare {
	return buildNode<PhpStmtDeclare>(
		'Stmt_Declare',
		{
			declares,
			stmts: options.stmts ?? null,
		},
		attributes
	);
}

/**
 * Builds a PHP class method declaration statement node.
 *
 * @category PHP AST
 * @param    name               - The name of the method.
 * @param    options            - Optional configuration for the method (by reference, flags, parameters, return type, statements, attribute groups).
 * @param    options.byRef
 * @param    options.flags
 * @param    options.params
 * @param    options.returnType
 * @param    options.stmts
 * @param    options.attrGroups
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpStmtClassMethod` node.
 */
export function buildClassMethod(
	name: PhpIdentifier,
	options: {
		byRef?: boolean;
		flags?: number;
		params?: PhpParam[];
		returnType?: PhpType | null;
		stmts?: PhpStmt[] | null;
		attrGroups?: PhpAttrGroup[];
	} = {},
	attributes?: PhpAttributes
): PhpStmtClassMethod {
	return buildNode<PhpStmtClassMethod>(
		'Stmt_ClassMethod',
		{
			name,
			byRef: options.byRef ?? false,
			flags: options.flags ?? 0,
			params: options.params ?? [],
			returnType: options.returnType ?? null,
			stmts: options.stmts ?? [],
			attrGroups: options.attrGroups ?? [],
		},
		attributes
	);
}

/**
 * Builds a PHP `return` statement node.
 *
 * @category PHP AST
 * @param    expr       - The expression to return, or `null` for an empty return.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtReturn` node.
 */
export function buildReturn(
	expr: PhpExpr | null,
	attributes?: PhpAttributes
): PhpStmtReturn {
	return buildNode<PhpStmtReturn>('Stmt_Return', { expr }, attributes);
}

/**
 * Builds a PHP expression statement node.
 *
 * @category PHP AST
 * @param    expr       - The expression to be used as a statement.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtExpression` node.
 */
export function buildExpressionStatement(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpStmtExpression {
	return buildNode<PhpStmtExpression>(
		'Stmt_Expression',
		{ expr },
		attributes
	);
}

/**
 * Builds a PHP `if` statement node.
 *
 * @category PHP AST
 * @param    cond               - The conditional expression.
 * @param    stmts              - An array of `PhpStmt` nodes for the `if` block.
 * @param    options            - Optional configuration for `elseif` and `else` branches.
 * @param    options.elseifs
 * @param    options.elseBranch
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpStmtIf` node.
 */
export function buildIfStatement(
	cond: PhpExpr,
	stmts: PhpStmt[],
	options: {
		elseifs?: PhpStmtElseIf[];
		elseBranch?: PhpStmtElse | null;
	} = {},
	attributes?: PhpAttributes
): PhpStmtIf {
	return buildNode<PhpStmtIf>(
		'Stmt_If',
		{
			cond,
			stmts,
			elseifs: options.elseifs ?? [],
			else: options.elseBranch ?? null,
		},
		attributes
	);
}

/**
 * Builds a PHP `foreach` loop statement node.
 *
 * @category PHP AST
 * @param    expr             - The expression to iterate over.
 * @param    options          - Configuration for the `foreach` loop (value variable, optional key variable, by reference, statements).
 * @param    options.valueVar
 * @param    options.keyVar
 * @param    options.byRef
 * @param    options.stmts
 * @param    attributes       - Optional attributes for the node.
 * @returns A `PhpStmtForeach` node.
 */
export function buildForeach(
	expr: PhpExpr,
	options: {
		valueVar: PhpExpr;
		keyVar?: PhpExpr | null;
		byRef?: boolean;
		stmts?: PhpStmt[];
	},
	attributes?: PhpAttributes
): PhpStmtForeach {
	return buildNode<PhpStmtForeach>(
		'Stmt_Foreach',
		{
			expr,
			valueVar: options.valueVar,
			keyVar: options.keyVar ?? null,
			byRef: options.byRef ?? false,
			stmts: options.stmts ?? [],
		},
		attributes
	);
}

/**
 * Builds a PHP `continue` statement node.
 *
 * @category PHP AST
 * @param    num        - The optional number of loops to continue (e.g., `continue 2`).
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpStmtContinue` node.
 */
export function buildContinue(
	num: PhpExpr | null = null,
	attributes?: PhpAttributes
): PhpStmtContinue {
	return buildNode<PhpStmtContinue>('Stmt_Continue', { num }, attributes);
}

export * from './types';
