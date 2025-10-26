import { buildNode, type PhpAttributes, type PhpNode } from '../base';
import type { PhpAttrGroup } from '../attributes';
import type { PhpConst } from '../const';
import type { PhpDeclareItem } from '../declareItem';
import type { PhpIdentifier } from '../identifier';
import type { PhpName } from '../name';
import type { PhpParam } from '../params';
import type { PhpType } from '../types';
import type { PhpExpr } from '../expressions';
import type { PhpPropertyHook } from '../propertyHook';

export interface PhpStmtBase extends PhpNode {
	readonly nodeType: `Stmt_${string}` | 'UseItem' | 'PropertyItem';
}

export interface PhpStmtNamespace extends PhpStmtBase {
	readonly nodeType: 'Stmt_Namespace';
	readonly name: PhpName | null;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_Use';
	readonly type: number;
	readonly uses: PhpStmtUseUse[];
}

export interface PhpStmtGroupUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_GroupUse';
	readonly type: number;
	readonly prefix: PhpName;
	readonly uses: PhpStmtUseUse[];
}

export interface PhpStmtUseUse extends PhpStmtBase {
	readonly nodeType: 'UseItem';
	readonly name: PhpName;
	readonly alias: PhpIdentifier | null;
	readonly type: number;
}

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

export interface PhpStmtTraitUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_TraitUse';
	readonly traits: PhpName[];
	readonly adaptations: PhpNode[];
}

export interface PhpStmtClassConst extends PhpStmtBase {
	readonly nodeType: 'Stmt_ClassConst';
	readonly flags: number;
	readonly consts: PhpConst[];
	readonly attrGroups: PhpAttrGroup[];
	readonly type: PhpType | null;
}

export interface PhpStmtProperty extends PhpStmtBase {
	readonly nodeType: 'Stmt_Property';
	readonly flags: number;
	readonly type: PhpType | null;
	readonly props: PhpStmtPropertyProperty[];
	readonly attrGroups: PhpAttrGroup[];
	readonly hooks: PhpPropertyHook[];
}

export interface PhpStmtPropertyProperty extends PhpStmtBase {
	readonly nodeType: 'PropertyItem';
	readonly name: PhpIdentifier;
	readonly default: PhpExpr | null;
}

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

export interface PhpStmtExpression extends PhpStmtBase {
	readonly nodeType: 'Stmt_Expression';
	readonly expr: PhpExpr;
}

export interface PhpStmtEcho extends PhpStmtBase {
	readonly nodeType: 'Stmt_Echo';
	readonly exprs: PhpExpr[];
}

export interface PhpStmtReturn extends PhpStmtBase {
	readonly nodeType: 'Stmt_Return';
	readonly expr: PhpExpr | null;
}

export interface PhpStmtDeclare extends PhpStmtBase {
	readonly nodeType: 'Stmt_Declare';
	readonly declares: PhpDeclareItem[];
	readonly stmts: PhpStmt[] | null;
}

export interface PhpStmtIf extends PhpStmtBase {
	readonly nodeType: 'Stmt_If';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
	readonly elseifs: PhpStmtElseIf[];
	readonly else: PhpStmtElse | null;
}

export interface PhpStmtElseIf extends PhpStmtBase {
	readonly nodeType: 'Stmt_ElseIf';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtElse extends PhpStmtBase {
	readonly nodeType: 'Stmt_Else';
	readonly stmts: PhpStmt[];
}

export interface PhpStmtForeach extends PhpStmtBase {
	readonly nodeType: 'Stmt_Foreach';
	readonly expr: PhpExpr;
	readonly valueVar: PhpExpr;
	readonly keyVar: PhpExpr | null;
	readonly byRef: boolean;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtFor extends PhpStmtBase {
	readonly nodeType: 'Stmt_For';
	readonly init: PhpExpr[];
	readonly cond: PhpExpr[];
	readonly loop: PhpExpr[];
	readonly stmts: PhpStmt[];
}

export interface PhpStmtWhile extends PhpStmtBase {
	readonly nodeType: 'Stmt_While';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtDo extends PhpStmtBase {
	readonly nodeType: 'Stmt_Do';
	readonly cond: PhpExpr;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtSwitch extends PhpStmtBase {
	readonly nodeType: 'Stmt_Switch';
	readonly cond: PhpExpr;
	readonly cases: PhpStmtCase[];
}

export interface PhpStmtCase extends PhpStmtBase {
	readonly nodeType: 'Stmt_Case';
	readonly cond: PhpExpr | null;
	readonly stmts: PhpStmt[];
}

export interface PhpStmtBreak extends PhpStmtBase {
	readonly nodeType: 'Stmt_Break';
	readonly num: PhpExpr | null;
}

export interface PhpStmtContinue extends PhpStmtBase {
	readonly nodeType: 'Stmt_Continue';
	readonly num: PhpExpr | null;
}

export interface PhpStmtNop extends PhpStmtBase {
	readonly nodeType: 'Stmt_Nop';
}

export type PhpClassStmt =
	| PhpStmtTraitUse
	| PhpStmtClassConst
	| PhpStmtProperty
	| PhpStmtClassMethod
	| PhpStmtNop
	| PhpStmtBase;

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

export type PhpProgram = ReadonlyArray<PhpStmt>;

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

export function buildStmtNop(attributes?: PhpAttributes): PhpStmtNop {
	return buildNode<PhpStmtNop>('Stmt_Nop', {}, attributes);
}

export function buildUse(
	type: number,
	uses: PhpStmtUseUse[],
	attributes?: PhpAttributes
): PhpStmtUse {
	return buildNode<PhpStmtUse>('Stmt_Use', { type, uses }, attributes);
}

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

export function buildReturn(
	expr: PhpExpr | null,
	attributes?: PhpAttributes
): PhpStmtReturn {
	return buildNode<PhpStmtReturn>('Stmt_Return', { expr }, attributes);
}

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

export function buildContinue(
	num: PhpExpr | null = null,
	attributes?: PhpAttributes
): PhpStmtContinue {
	return buildNode<PhpStmtContinue>('Stmt_Continue', { num }, attributes);
}
