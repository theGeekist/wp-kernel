/**
 * Canonical PHP AST types for JSON serialisation.
 *
 * This mirrors the structure emitted by `nikic/PHP-Parser` when hydrated via
 * `JsonSerializable`. Refer to packages/cli/docs/php-json-schema.md for the
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
export function buildNode<T extends PhpNode>(
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

export function buildIdentifier(
	name: string,
	attributes?: PhpAttributes
): PhpIdentifier {
	return buildNode<PhpIdentifier>('Identifier', { name }, attributes);
}

export function buildName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name', { parts }, attributes);
}

export function buildFullyQualifiedName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name_FullyQualified', { parts }, attributes);
}

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
	attributes?: PhpAttributes
): PhpStmtUseUse {
	return buildNode<PhpStmtUseUse>('Stmt_UseUse', { name, alias }, attributes);
}

export function buildClass(
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
	return buildNode<PhpStmtClass>(
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

export function buildParam(
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
	return buildNode<PhpParam>(
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

export function buildScalarString(
	value: string,
	attributes?: PhpAttributes
): PhpScalarString {
	return buildNode<PhpScalarString>('Scalar_String', { value }, attributes);
}

export function buildScalarInt(
	value: number,
	attributes?: PhpAttributes
): PhpScalarLNumber {
	return buildNode<PhpScalarLNumber>('Scalar_LNumber', { value }, attributes);
}

export function buildScalarFloat(
	value: number,
	attributes?: PhpAttributes
): PhpScalarDNumber {
	return buildNode<PhpScalarDNumber>('Scalar_DNumber', { value }, attributes);
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

export function buildArg(
	value: PhpExpr,
	options: {
		byRef?: boolean;
		unpack?: boolean;
		name?: PhpIdentifier | null;
	} = {},
	attributes?: PhpAttributes
): PhpArg {
	return buildNode<PhpArg>(
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
