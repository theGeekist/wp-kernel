/**
 * Canonical PHP AST types for JSON serialisation.
 *
 * This mirrors the structure emitted by `nikic/PHP-Parser` when hydrated via
 * `JsonSerializable`. Refer to packages/cli/docs/JSON_representation.md for the
 * authoritative schema. Generated definitions can be cross-checked against the
 * upstream PHP implementation at
 * `packages/cli/vendor/nikic/php-parser/lib/PhpParser`.
 *
 * Builders should construct these nodes so we can persist
 * deterministic `.ast.json` artefacts without re-parsing generated PHP source.
 */

export type PhpAttributes = Readonly<Record<string, unknown>>;

const EMPTY_ATTRIBUTES: PhpAttributes = Object.freeze({});

function normaliseAttributes(attributes?: PhpAttributes): PhpAttributes {
	if (!attributes) {
		return EMPTY_ATTRIBUTES;
	}

	if (attributes === EMPTY_ATTRIBUTES) {
		return attributes;
	}

	const keys = Object.keys(attributes);
	return keys.length === 0 ? EMPTY_ATTRIBUTES : { ...attributes };
}

export interface PhpNode {
	readonly nodeType: string;
	readonly attributes: PhpAttributes;
}

export interface PhpIdentifier extends PhpNode {
	readonly nodeType: 'Identifier';
	readonly name: string;
}

export interface PhpName extends PhpNode {
	readonly nodeType: 'Name' | 'Name_FullyQualified' | 'Name_Relative';
	readonly parts: string[];
}

export interface PhpNullableType extends PhpNode {
	readonly nodeType: 'NullableType';
	readonly type: PhpType;
}

export interface PhpUnionType extends PhpNode {
	readonly nodeType: 'UnionType';
	readonly types: PhpType[];
}

export interface PhpIntersectionType extends PhpNode {
	readonly nodeType: 'IntersectionType';
	readonly types: PhpType[];
}

export type PhpType =
	| PhpIdentifier
	| PhpName
	| PhpNullableType
	| PhpUnionType
	| PhpIntersectionType;

export interface PhpAttrGroup extends PhpNode {
	readonly nodeType: 'AttributeGroup';
	readonly attrs: PhpAttribute[];
}

export interface PhpAttribute extends PhpNode {
	readonly nodeType: 'Attribute';
	readonly name: PhpName | PhpIdentifier;
	readonly args: PhpArg[];
}

export interface PhpArg extends PhpNode {
	readonly nodeType: 'Arg';
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
	readonly name: PhpIdentifier | null;
}

export interface PhpParam extends PhpNode {
	readonly nodeType: 'Param';
	readonly type: PhpType | null;
	readonly byRef: boolean;
	readonly variadic: boolean;
	readonly var: PhpExpr;
	readonly default: PhpExpr | null;
	readonly flags: number;
	readonly attrGroups: PhpAttrGroup[];
}

export interface PhpStmtBase extends PhpNode {
	readonly nodeType: `Stmt_${string}`;
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

export interface PhpStmtUseUse extends PhpStmtBase {
	readonly nodeType: 'Stmt_UseUse';
	readonly name: PhpName;
	readonly alias: PhpIdentifier | null;
}

export interface PhpStmtClass extends PhpStmtBase {
	readonly nodeType: 'Stmt_Class';
	readonly name: PhpIdentifier | null;
	readonly flags: number;
	readonly extends: PhpName | null;
	readonly implements: PhpName[];
	readonly stmts: PhpClassStmt[];
	readonly attrGroups: PhpAttrGroup[];
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
}

export interface PhpConst extends PhpNode {
	readonly nodeType: 'Const';
	readonly name: PhpIdentifier;
	readonly value: PhpExpr;
}

export interface PhpStmtProperty extends PhpStmtBase {
	readonly nodeType: 'Stmt_Property';
	readonly flags: number;
	readonly type: PhpType | null;
	readonly props: PhpStmtPropertyProperty[];
	readonly attrGroups: PhpAttrGroup[];
}

export interface PhpStmtPropertyProperty extends PhpStmtBase {
	readonly nodeType: 'Stmt_PropertyProperty';
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
}

export interface PhpStmtExpression extends PhpStmtBase {
	readonly nodeType: 'Stmt_Expression';
	readonly expr: PhpExpr;
}

export interface PhpStmtReturn extends PhpStmtBase {
	readonly nodeType: 'Stmt_Return';
	readonly expr: PhpExpr | null;
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
	| PhpStmtClass
	| PhpStmtTraitUse
	| PhpStmtClassConst
	| PhpStmtProperty
	| PhpStmtClassMethod
	| PhpStmtFunction
	| PhpStmtExpression
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

export interface PhpExprBase extends PhpNode {
	readonly nodeType: `Expr_${string}`;
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
	readonly nodeType: 'Expr_ArrayItem';
	readonly key: PhpExpr | null;
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
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

export type PhpExpr =
	| PhpExprAssign
	| PhpExprArray
	| PhpExprArrayItem
	| PhpExprVariable
	| PhpExprMethodCall
	| PhpExprStaticCall
	| PhpExprFuncCall
	| PhpExprNew
	| PhpExprConstFetch
	| PhpExprBooleanNot
	| PhpExprBinaryOp
	| PhpExprTernary
	| PhpExprNullsafePropertyFetch
	| PhpExprPropertyFetch
	| PhpExprStaticPropertyFetch
	| PhpExprCoalesce
	| PhpExprBase;

export interface PhpScalarBase extends PhpNode {
	readonly nodeType: `Scalar_${string}`;
}

export interface PhpScalarString extends PhpScalarBase {
	readonly nodeType: 'Scalar_String';
	readonly value: string;
}

export interface PhpScalarLNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_LNumber';
	readonly value: number;
}

export interface PhpScalarDNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_DNumber';
	readonly value: number;
}

export interface PhpScalarMagicConst extends PhpScalarBase {
	readonly nodeType: `Scalar_MagicConst_${string}`;
}

export type PhpScalar =
	| PhpScalarString
	| PhpScalarLNumber
	| PhpScalarDNumber
	| PhpScalarMagicConst
	| PhpScalarBase;

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

export type PhpNodeLike =
	| PhpStmt
	| PhpExpr
	| PhpScalar
	| PhpType
	| PhpAttribute
	| PhpAttrGroup
	| PhpParam
	| PhpArg
	| PhpConst;

/**
 * Generic factory helper for node construction. Consumers should prefer the
 * explicit builders exported below, but this remains available for niche
 * constructs that do not yet have a dedicated helper.
 * @param nodeType
 * @param props
 * @param attributes
 */
export function createNode<T extends PhpNode>(
	nodeType: T['nodeType'],
	props: Omit<T, 'nodeType' | 'attributes'>,
	attributes?: PhpAttributes
): T {
	return {
		nodeType,
		attributes: normaliseAttributes(attributes),
		...(props as Record<string, unknown>),
	} as T;
}

export function createIdentifier(
	name: string,
	attributes?: PhpAttributes
): PhpIdentifier {
	return createNode<PhpIdentifier>('Identifier', { name }, attributes);
}

export function createName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return createNode<PhpName>('Name', { parts }, attributes);
}

export function createFullyQualifiedName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return createNode<PhpName>('Name_FullyQualified', { parts }, attributes);
}

export function createNamespace(
	name: PhpName | null,
	stmts: PhpStmt[],
	attributes?: PhpAttributes
): PhpStmtNamespace {
	return createNode<PhpStmtNamespace>(
		'Stmt_Namespace',
		{ name, stmts },
		attributes
	);
}

export function createUse(
	type: number,
	uses: PhpStmtUseUse[],
	attributes?: PhpAttributes
): PhpStmtUse {
	return createNode<PhpStmtUse>('Stmt_Use', { type, uses }, attributes);
}

export function createUseUse(
	name: PhpName,
	alias: PhpIdentifier | null = null,
	attributes?: PhpAttributes
): PhpStmtUseUse {
	return createNode<PhpStmtUseUse>(
		'Stmt_UseUse',
		{ name, alias },
		attributes
	);
}

export function createClass(
	name: PhpIdentifier | null,
	options: {
		flags?: number;
		extends?: PhpName | null;
		implements?: PhpName[];
		stmts?: PhpClassStmt[];
		attrGroups?: PhpAttrGroup[];
	} = {},
	attributes?: PhpAttributes
): PhpStmtClass {
	return createNode<PhpStmtClass>(
		'Stmt_Class',
		{
			name,
			flags: options.flags ?? 0,
			extends: options.extends ?? null,
			implements: options.implements ?? [],
			stmts: options.stmts ?? [],
			attrGroups: options.attrGroups ?? [],
		},
		attributes
	);
}

export function createClassMethod(
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
	return createNode<PhpStmtClassMethod>(
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

export function createParam(
	variable: PhpExpr,
	options: {
		type?: PhpType | null;
		byRef?: boolean;
		variadic?: boolean;
		default?: PhpExpr | null;
		flags?: number;
		attrGroups?: PhpAttrGroup[];
	} = {},
	attributes?: PhpAttributes
): PhpParam {
	return createNode<PhpParam>(
		'Param',
		{
			type: options.type ?? null,
			byRef: options.byRef ?? false,
			variadic: options.variadic ?? false,
			var: variable,
			default: options.default ?? null,
			flags: options.flags ?? 0,
			attrGroups: options.attrGroups ?? [],
		},
		attributes
	);
}

export function createReturn(
	expr: PhpExpr | null,
	attributes?: PhpAttributes
): PhpStmtReturn {
	return createNode<PhpStmtReturn>('Stmt_Return', { expr }, attributes);
}

export function createExpressionStatement(
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpStmtExpression {
	return createNode<PhpStmtExpression>(
		'Stmt_Expression',
		{ expr },
		attributes
	);
}

export function createArray(
	items: PhpExprArrayItem[],
	attributes?: PhpAttributes
): PhpExprArray {
	return createNode<PhpExprArray>('Expr_Array', { items }, attributes);
}

export function createArrayItem(
	value: PhpExpr,
	options: {
		key?: PhpExpr | null;
		byRef?: boolean;
		unpack?: boolean;
	} = {},
	attributes?: PhpAttributes
): PhpExprArrayItem {
	return createNode<PhpExprArrayItem>(
		'Expr_ArrayItem',
		{
			key: options.key ?? null,
			value,
			byRef: options.byRef ?? false,
			unpack: options.unpack ?? false,
		},
		attributes
	);
}

export function createScalarString(
	value: string,
	attributes?: PhpAttributes
): PhpScalarString {
	return createNode<PhpScalarString>('Scalar_String', { value }, attributes);
}

export function createScalarInt(
	value: number,
	attributes?: PhpAttributes
): PhpScalarLNumber {
	return createNode<PhpScalarLNumber>(
		'Scalar_LNumber',
		{ value },
		attributes
	);
}

export function createScalarFloat(
	value: number,
	attributes?: PhpAttributes
): PhpScalarDNumber {
	return createNode<PhpScalarDNumber>(
		'Scalar_DNumber',
		{ value },
		attributes
	);
}

export function createScalarBool(
	value: boolean,
	attributes?: PhpAttributes
): PhpExprConstFetch {
	return createNode<PhpExprConstFetch>(
		'Expr_ConstFetch',
		{
			name: createName(value ? ['true'] : ['false']),
		},
		attributes
	);
}

export function createNull(attributes?: PhpAttributes): PhpExprConstFetch {
	return createNode<PhpExprConstFetch>(
		'Expr_ConstFetch',
		{
			name: createName(['null']),
		},
		attributes
	);
}

export function createVariable(
	name: string | PhpExpr,
	attributes?: PhpAttributes
): PhpExprVariable {
	return createNode<PhpExprVariable>('Expr_Variable', { name }, attributes);
}

export function createAssign(
	variable: PhpExpr,
	expr: PhpExpr,
	attributes?: PhpAttributes
): PhpExprAssign {
	return createNode<PhpExprAssign>(
		'Expr_Assign',
		{ var: variable, expr },
		attributes
	);
}

export function createMethodCall(
	variable: PhpExpr,
	name: PhpIdentifier | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprMethodCall {
	return createNode<PhpExprMethodCall>(
		'Expr_MethodCall',
		{ var: variable, name, args },
		attributes
	);
}

export function createStaticCall(
	className: PhpName | PhpExpr,
	name: PhpIdentifier | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprStaticCall {
	return createNode<PhpExprStaticCall>(
		'Expr_StaticCall',
		{ class: className, name, args },
		attributes
	);
}

export function createFuncCall(
	name: PhpName | PhpExpr,
	args: PhpArg[] = [],
	attributes?: PhpAttributes
): PhpExprFuncCall {
	return createNode<PhpExprFuncCall>(
		'Expr_FuncCall',
		{ name, args },
		attributes
	);
}

export function createArg(
	value: PhpExpr,
	options: {
		byRef?: boolean;
		unpack?: boolean;
		name?: PhpIdentifier | null;
	} = {},
	attributes?: PhpAttributes
): PhpArg {
	return createNode<PhpArg>(
		'Arg',
		{
			value,
			byRef: options.byRef ?? false,
			unpack: options.unpack ?? false,
			name: options.name ?? null,
		},
		attributes
	);
}
