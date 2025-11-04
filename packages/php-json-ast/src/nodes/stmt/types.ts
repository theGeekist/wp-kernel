import { type PhpAttrGroup } from '../attributes';
import { type PhpNode } from '../base';
import { type PhpConst } from '../const';
import { type PhpDeclareItem } from '../declareItem';
import { type PhpExpr } from '../expressions';
import { type PhpIdentifier } from '../identifier';
import { type PhpName } from '../name';
import { type PhpParam } from '../params';
import { type PhpPropertyHook } from '../propertyHook';
import { type PhpType } from '../types';

/**
 * Base interface for all PHP statement nodes.
 *
 * @category PHP AST
 */
export interface PhpStmtBase extends PhpNode {
	readonly nodeType: `Stmt_${string}` | 'UseItem' | 'PropertyItem';
}

/**
 * Represents a PHP namespace declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtNamespace extends PhpStmtBase {
	readonly nodeType: 'Stmt_Namespace';
	readonly name: PhpName | null;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `use` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_Use';
	readonly type: number;
	readonly uses: PhpStmtUseUse[];
}

/**
 * Represents a PHP group `use` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtGroupUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_GroupUse';
	readonly type: number;
	readonly prefix: PhpName;
	readonly uses: PhpStmtUseUse[];
}

/**
 * Represents an item within a PHP `use` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtUseUse extends PhpStmtBase {
	readonly nodeType: 'UseItem';
	readonly name: PhpName;
	readonly alias: PhpIdentifier | null;
	readonly type: number;
}

/**
 * Represents a PHP class declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtClass extends PhpStmtBase {
	readonly nodeType: 'Stmt_Class';
	readonly name: PhpIdentifier | null;
	readonly flags: number;
	readonly extends: PhpName | null;
	readonly implements: PhpName[];
	readonly stmts: PhpClassStmt[];
	readonly attrGroups: PhpAttrGroup[];
	readonly namespacedName: PhpName | null;
}

/**
 * Represents a PHP `trait use` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtTraitUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_TraitUse';
	readonly traits: PhpName[];
	readonly adaptations: PhpNode[];
}

/**
 * Represents a PHP class constant declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtClassConst extends PhpStmtBase {
	readonly nodeType: 'Stmt_ClassConst';
	readonly flags: number;
	readonly consts: PhpConst[];
	readonly attrGroups: PhpAttrGroup[];
	readonly type: PhpType | null;
}

/**
 * Represents a PHP class property declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtProperty extends PhpStmtBase {
	readonly nodeType: 'Stmt_Property';
	readonly flags: number;
	readonly type: PhpType | null;
	readonly props: PhpStmtPropertyProperty[];
	readonly attrGroups: PhpAttrGroup[];
	readonly hooks: PhpPropertyHook[];
}

/**
 * Represents a single property within a PHP class property declaration.
 *
 * @category PHP AST
 */
export interface PhpStmtPropertyProperty extends PhpStmtBase {
	readonly nodeType: 'PropertyItem';
	readonly name: PhpIdentifier;
	readonly default: PhpExpr | null;
}

/**
 * Represents a PHP class method declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtClassMethod extends PhpStmtBase {
	readonly nodeType: 'Stmt_ClassMethod';
	readonly name: PhpIdentifier;
	readonly byRef: boolean;
	readonly flags: number;
	readonly params: PhpParam[];
	readonly returnType: PhpType | null;
	readonly stmts: PhpStmt[] | null;
	readonly attrGroups: PhpAttrGroup[];
}

/**
 * Represents a PHP function declaration statement.
 *
 * @category PHP AST
 */
export interface PhpStmtFunction extends PhpStmtBase {
	readonly nodeType: 'Stmt_Function';
	readonly byRef: boolean;
	readonly name: PhpIdentifier;
	readonly params: PhpParam[];
	readonly returnType: PhpType | null;
	readonly stmts: PhpStmt[];
	readonly attrGroups: PhpAttrGroup[];
	readonly namespacedName: PhpName | null;
}

/**
 * Represents a PHP expression statement.
 *
 * @category PHP AST
 */
export interface PhpStmtExpression extends PhpStmtBase {
	readonly nodeType: 'Stmt_Expression';
	readonly expr: PhpExpr;
}

/**
 * Represents a PHP `echo` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtEcho extends PhpStmtBase {
	readonly nodeType: 'Stmt_Echo';
	readonly exprs: PhpExpr[];
}

/**
 * Represents a PHP `return` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtReturn extends PhpStmtBase {
	readonly nodeType: 'Stmt_Return';
	readonly expr: PhpExpr | null;
}

/**
 * Represents a PHP `declare` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtDeclare extends PhpStmtBase {
	readonly nodeType: 'Stmt_Declare';
	readonly declares: PhpDeclareItem[];
	readonly stmts: PhpStmt[] | null;
}

/**
 * Represents a PHP `if` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtIf extends PhpStmtBase {
	readonly nodeType: 'Stmt_If';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
	readonly elseifs: PhpStmtElseIf[];
	readonly else: PhpStmtElse | null;
}

/**
 * Represents a PHP `elseif` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtElseIf extends PhpStmtBase {
	readonly nodeType: 'Stmt_ElseIf';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `else` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtElse extends PhpStmtBase {
	readonly nodeType: 'Stmt_Else';
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `foreach` loop statement.
 *
 * @category PHP AST
 */
export interface PhpStmtForeach extends PhpStmtBase {
	readonly nodeType: 'Stmt_Foreach';
	readonly expr: PhpExpr;
	readonly valueVar: PhpExpr;
	readonly keyVar: PhpExpr | null;
	readonly byRef: boolean;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `for` loop statement.
 *
 * @category PHP AST
 */
export interface PhpStmtFor extends PhpStmtBase {
	readonly nodeType: 'Stmt_For';
	readonly init: PhpExpr[];
	readonly cond: PhpExpr[];
	readonly loop: PhpExpr[];
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `while` loop statement.
 *
 * @category PHP AST
 */
export interface PhpStmtWhile extends PhpStmtBase {
	readonly nodeType: 'Stmt_While';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `do-while` loop statement.
 *
 * @category PHP AST
 */
export interface PhpStmtDo extends PhpStmtBase {
	readonly nodeType: 'Stmt_Do';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `switch` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtSwitch extends PhpStmtBase {
	readonly nodeType: 'Stmt_Switch';
	readonly cond: PhpExpr;
	readonly cases: PhpStmtCase[];
}

/**
 * Represents a PHP `case` statement within a `switch` block.
 *
 * @category PHP AST
 */
export interface PhpStmtCase extends PhpStmtBase {
	readonly nodeType: 'Stmt_Case';
	readonly cond: PhpExpr | null;
	readonly stmts: PhpStmt[];
}

/**
 * Represents a PHP `break` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtBreak extends PhpStmtBase {
	readonly nodeType: 'Stmt_Break';
	readonly num: PhpExpr | null;
}

/**
 * Represents a PHP `continue` statement.
 *
 * @category PHP AST
 */
export interface PhpStmtContinue extends PhpStmtBase {
	readonly nodeType: 'Stmt_Continue';
	readonly num: PhpExpr | null;
}

/**
 * Represents a PHP no-operation statement.
 *
 * @category PHP AST
 */
export interface PhpStmtNop extends PhpStmtBase {
	readonly nodeType: 'Stmt_Nop';
}

/**
 * Represents a statement that can appear within a PHP class.
 *
 * @category PHP AST
 */
export type PhpClassStmt =
	| PhpStmtTraitUse
	| PhpStmtClassConst
	| PhpStmtProperty
	| PhpStmtClassMethod
	| PhpStmtNop
	| PhpStmtBase;

/**
 * Represents any PHP statement node.
 *
 * @category PHP AST
 */
export type PhpStmt =
	| PhpStmtNamespace
	| PhpStmtUse
	| PhpStmtGroupUse
	| PhpStmtClass
	| PhpStmtDeclare
	| PhpStmtTraitUse
	| PhpStmtClassConst
	| PhpStmtProperty
	| PhpStmtClassMethod
	| PhpStmtFunction
	| PhpStmtExpression
	| PhpStmtEcho
	| PhpStmtReturn
	| PhpStmtIf
	| PhpStmtForeach
	| PhpStmtFor
	| PhpStmtWhile
	| PhpStmtDo
	| PhpStmtSwitch
	| PhpStmtCase
	| PhpStmtBreak
	| PhpStmtContinue
	| PhpStmtNop
	| PhpStmtElseIf
	| PhpStmtElse
	| PhpStmtBase;

/**
 * Represents a complete PHP program as an array of statements.
 *
 * @category PHP AST
 */
export type PhpProgram = ReadonlyArray<PhpStmt>;
