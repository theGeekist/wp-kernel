import {
	type PhpArg,
	type PhpExpr,
	type PhpExprArray,
	type PhpExprArrayItem,
	type PhpExprArrowFunction,
	type PhpExprAssign,
	type PhpExprBinaryOp,
	type PhpExprMatch,
	type PhpExprNew,
	type PhpExprVariable,
	type PhpMatchArm,
	type PhpName,
	type PhpParam,
	type PhpStmt,
	type PhpStmtExpression,
	type PhpStmtIf,
	type PhpStmtReturn,
	type PhpType,
	type PhpPrintable,
	buildPrintable,
} from '@wpkernel/php-json-ast';
import { escapeSingleQuotes } from '@wpkernel/php-json-ast';

type ExprNodeType = PhpExpr['nodeType'];
type ExtractExpr<T extends ExprNodeType> = Extract<PhpExpr, { nodeType: T }>;

type CastNodeType =
	| 'Expr_Cast_Int'
	| 'Expr_Cast_Double'
	| 'Expr_Cast_String'
	| 'Expr_Cast_Bool'
	| 'Expr_Cast_Array';

type InlineFormatter = (expr: PhpExpr) => string;

const INLINE_STATEMENT_NODE_TYPES: ReadonlySet<ExprNodeType> = new Set([
	'Expr_Variable',
	'Expr_ArrayDimFetch',
	'Expr_MethodCall',
	'Expr_FuncCall',
	'Expr_New',
	'Expr_PropertyFetch',
	'Expr_Cast_Int',
	'Expr_Cast_Double',
	'Expr_Cast_String',
	'Expr_Cast_Bool',
	'Expr_Cast_Array',
	'Expr_BooleanNot',
	'Expr_Instanceof',
	'Expr_ArrowFunction',
	'Expr_Match',
	'Expr_ConstFetch',
	'Expr_BinaryOp_Plus',
	'Expr_BinaryOp_Minus',
	'Expr_BinaryOp_Mul',
	'Expr_BinaryOp_Div',
	'Expr_BinaryOp_Mod',
	'Expr_BinaryOp_BooleanAnd',
	'Expr_BinaryOp_BooleanOr',
	'Expr_BinaryOp_Smaller',
	'Expr_BinaryOp_SmallerOrEqual',
	'Expr_BinaryOp_Greater',
	'Expr_BinaryOp_GreaterOrEqual',
	'Expr_BinaryOp_Equal',
	'Expr_BinaryOp_NotEqual',
	'Expr_BinaryOp_Identical',
	'Expr_BinaryOp_NotIdentical',
	'Scalar_String',
	'Scalar_LNumber',
	'Scalar_DNumber',
]);

const CAST_TYPE_LABEL: Record<CastNodeType, string> = {
	Expr_Cast_Int: 'int',
	Expr_Cast_Double: 'float',
	Expr_Cast_String: 'string',
	Expr_Cast_Bool: 'bool',
	Expr_Cast_Array: 'array',
};

const BINARY_OPERATOR_LABELS: Partial<Record<ExprNodeType, string>> = {
	Expr_BinaryOp_Plus: '+',
	Expr_BinaryOp_Minus: '-',
	Expr_BinaryOp_Mul: '*',
	Expr_BinaryOp_Div: '/',
	Expr_BinaryOp_Mod: '%',
	Expr_BinaryOp_BooleanAnd: '&&',
	Expr_BinaryOp_BooleanOr: '||',
	Expr_BinaryOp_Smaller: '<',
	Expr_BinaryOp_SmallerOrEqual: '<=',
	Expr_BinaryOp_Greater: '>',
	Expr_BinaryOp_GreaterOrEqual: '>=',
	Expr_BinaryOp_Equal: '==',
	Expr_BinaryOp_NotEqual: '!=',
	Expr_BinaryOp_Identical: '===',
	Expr_BinaryOp_NotIdentical: '!==',
};

const BOOLEAN_NOT_PAREN_NODES: ReadonlySet<ExprNodeType> = new Set([
	'Expr_BinaryOp_Plus',
	'Expr_BinaryOp_Minus',
	'Expr_BinaryOp_Mul',
	'Expr_BinaryOp_Div',
	'Expr_BinaryOp_Mod',
	'Expr_BinaryOp_BooleanAnd',
	'Expr_BinaryOp_BooleanOr',
	'Expr_BinaryOp_Smaller',
	'Expr_BinaryOp_SmallerOrEqual',
	'Expr_BinaryOp_Greater',
	'Expr_BinaryOp_GreaterOrEqual',
	'Expr_BinaryOp_Equal',
	'Expr_BinaryOp_NotEqual',
	'Expr_BinaryOp_Identical',
	'Expr_BinaryOp_NotIdentical',
	'Expr_BooleanNot',
	'Expr_Assign',
	'Expr_Array',
	'Expr_ArrowFunction',
	'Expr_Closure',
	'Expr_Ternary',
	'Expr_Match',
	'Expr_New',
]);

const INLINE_FORMATTERS: Partial<Record<ExprNodeType, InlineFormatter>> = {
	Expr_Variable: (expr) =>
		formatVariableName(expr as ExtractExpr<'Expr_Variable'>),
	Expr_ArrayDimFetch: (expr) => {
		const fetch = expr as ExtractExpr<'Expr_ArrayDimFetch'>;
		const dimension = fetch.dim ? formatInlineExpression(fetch.dim) : '';
		return `${formatInlineExpression(fetch.var)}[${dimension}]`;
	},
	Expr_PropertyFetch: (expr) => {
		const property = expr as ExtractExpr<'Expr_PropertyFetch'>;
		return `${formatInlineExpression(property.var)}->${formatIdentifierOrExpr(
			property.name
		)}`;
	},
	Expr_MethodCall: (expr) => {
		const method = expr as ExtractExpr<'Expr_MethodCall'>;
		return `${formatInlineExpression(method.var)}->${formatIdentifierOrExpr(
			method.name
		)}(${formatArguments(method.args)})`;
	},
	Expr_FuncCall: (expr) => {
		const func = expr as ExtractExpr<'Expr_FuncCall'>;
		return `${formatInlineExpression(func.name)}(${formatArguments(
			func.args
		)})`;
	},
	Expr_New: (expr) => formatNewExpression(expr as ExtractExpr<'Expr_New'>),
	Expr_Cast_Int: (expr) =>
		formatCastExpression(expr as ExtractExpr<'Expr_Cast_Int'>),
	Expr_Cast_Double: (expr) =>
		formatCastExpression(expr as ExtractExpr<'Expr_Cast_Double'>),
	Expr_Cast_String: (expr) =>
		formatCastExpression(expr as ExtractExpr<'Expr_Cast_String'>),
	Expr_Cast_Bool: (expr) =>
		formatCastExpression(expr as ExtractExpr<'Expr_Cast_Bool'>),
	Expr_Cast_Array: (expr) =>
		formatCastExpression(expr as ExtractExpr<'Expr_Cast_Array'>),
	Expr_Array: (expr) => formatInlineArray(expr as ExtractExpr<'Expr_Array'>),
	Expr_Ternary: (expr) => {
		const ternary = expr as ExtractExpr<'Expr_Ternary'>;
		const condition = formatInlineExpression(ternary.cond);
		const trueBranch = ternary.if ? formatInlineExpression(ternary.if) : '';
		const falseBranch = formatInlineExpression(ternary.else);

		if (ternary.if) {
			return `${condition} ? ${trueBranch} : ${falseBranch}`;
		}

		return `${condition} ?: ${falseBranch}`;
	},
	Expr_BooleanNot: (expr) => {
		const booleanNot = expr as ExtractExpr<'Expr_BooleanNot'>;
		const value = formatInlineExpression(booleanNot.expr);
		return needsBooleanNotParens(booleanNot.expr)
			? `!(${value})`
			: `!${value}`;
	},
	Expr_Instanceof: (expr) => {
		const instance = expr as ExtractExpr<'Expr_Instanceof'>;
		return `${formatInlineExpression(instance.expr)} instanceof ${formatInlineExpression(
			instance.class
		)}`;
	},
	Expr_ArrowFunction: (expr) =>
		formatArrowFunction(expr as ExtractExpr<'Expr_ArrowFunction'>),
	Expr_Match: (expr) =>
		formatMatchExpression(expr as ExtractExpr<'Expr_Match'>),
	Expr_ConstFetch: (expr) => {
		const constFetch = expr as ExtractExpr<'Expr_ConstFetch'>;
		return formatInlineExpression(constFetch.name);
	},
	Expr_BinaryOp_Plus: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Plus'>),
	Expr_BinaryOp_Minus: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Minus'>),
	Expr_BinaryOp_Mul: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Mul'>),
	Expr_BinaryOp_Div: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Div'>),
	Expr_BinaryOp_Mod: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Mod'>),
	Expr_BinaryOp_BooleanAnd: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_BooleanAnd'>),
	Expr_BinaryOp_BooleanOr: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_BooleanOr'>),
	Expr_BinaryOp_Smaller: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Smaller'>),
	Expr_BinaryOp_SmallerOrEqual: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_SmallerOrEqual'>),
	Expr_BinaryOp_Greater: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Greater'>),
	Expr_BinaryOp_GreaterOrEqual: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_GreaterOrEqual'>),
	Expr_BinaryOp_Equal: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Equal'>),
	Expr_BinaryOp_NotEqual: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_NotEqual'>),
	Expr_BinaryOp_Identical: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_Identical'>),
	Expr_BinaryOp_NotIdentical: (expr) =>
		formatBinaryOp(expr as ExtractExpr<'Expr_BinaryOp_NotIdentical'>),
	Scalar_String: (expr) =>
		`'${escapeSingleQuotes((expr as ExtractExpr<'Scalar_String'>).value)}'`,
	Scalar_LNumber: (expr) =>
		String((expr as ExtractExpr<'Scalar_LNumber'>).value),
	Scalar_DNumber: (expr) =>
		String((expr as ExtractExpr<'Scalar_DNumber'>).value),
};

export interface FormatOptions {
	readonly indentLevel: number;
	readonly indentUnit: string;
}

export function formatStatementPrintable<T extends PhpStmt>(
	statement: T,
	options: FormatOptions
): PhpPrintable<T> {
	const lines = formatStatement(
		statement,
		options.indentLevel,
		options.indentUnit
	);
	return buildPrintable(statement, lines);
}

export function formatStatement(
	statement: PhpStmt,
	indentLevel: number,
	indentUnit: string
): string[] {
	switch (statement.nodeType) {
		case 'Stmt_Expression':
			return formatExpressionStatement(
				statement as Extract<PhpStmt, { nodeType: 'Stmt_Expression' }>,
				indentLevel,
				indentUnit
			);
		case 'Stmt_If':
			return formatIfStatement(
				statement as Extract<PhpStmt, { nodeType: 'Stmt_If' }>,
				indentLevel,
				indentUnit
			);
		case 'Stmt_Nop':
			return formatNopStatement(
				statement as Extract<PhpStmt, { nodeType: 'Stmt_Nop' }>,
				indentLevel,
				indentUnit
			);
		case 'Stmt_Foreach':
			return formatForeachStatement(
				statement as Extract<PhpStmt, { nodeType: 'Stmt_Foreach' }>,
				indentLevel,
				indentUnit
			);
		case 'Stmt_Continue':
			return [`${indent(indentLevel, indentUnit)}continue;`];
		case 'Stmt_Return':
			return formatReturnStatement(
				statement as Extract<PhpStmt, { nodeType: 'Stmt_Return' }>,
				indentLevel,
				indentUnit
			);
		default:
			throw new Error(
				`Unsupported statement node for formatting: ${statement.nodeType}`
			);
	}
}

export function formatExpression(
	expression: PhpExpr,
	indentLevel: number,
	indentUnit: string
): string[] {
	if (expression.nodeType === 'Expr_Assign') {
		return formatAssignExpression(
			expression as ExtractExpr<'Expr_Assign'>,
			indentLevel,
			indentUnit
		);
	}

	if (expression.nodeType === 'Expr_Array') {
		return formatArrayExpression(
			expression as ExtractExpr<'Expr_Array'>,
			indentLevel,
			indentUnit
		);
	}

	if (expression.nodeType === 'Expr_Ternary') {
		return formatTernaryExpression(
			expression as ExtractExpr<'Expr_Ternary'>,
			indentLevel,
			indentUnit
		);
	}

	if (INLINE_STATEMENT_NODE_TYPES.has(expression.nodeType)) {
		return formatInlineStatement(expression, indentLevel, indentUnit);
	}

	throw new Error(
		`Unsupported expression node for formatting: ${expression.nodeType}`
	);
}

function formatInlineStatement(
	expression: PhpExpr,
	indentLevel: number,
	indentUnit: string
): string[] {
	if (!INLINE_STATEMENT_NODE_TYPES.has(expression.nodeType)) {
		throw new Error(
			`Unsupported inline expression node for formatting: ${expression.nodeType}`
		);
	}

	return [
		`${indent(indentLevel, indentUnit)}${formatInlineExpression(expression)}`,
	];
}

function formatExpressionStatement(
	statement: PhpStmtExpression,
	indentLevel: number,
	indentUnit: string
): string[] {
	const lines = formatExpression(statement.expr, indentLevel, indentUnit);
	if (lines.length === 0) {
		return [`${indent(indentLevel, indentUnit)};`];
	}

	const formatted = [...lines];
	const lastIndex = formatted.length - 1;
	formatted[lastIndex] = `${formatted[lastIndex]};`;
	return formatted;
}

function formatIfStatement(
	statement: PhpStmtIf,
	indentLevel: number,
	indentUnit: string
): string[] {
	const currentIndent = indent(indentLevel, indentUnit);
	const condition = formatInlineExpression(statement.cond);
	const lines = [`${currentIndent}if (${condition}) {`];

	for (let index = 0; index < statement.stmts.length; index += 1) {
		const child = statement.stmts[index]!;
		const formatted = formatStatement(child, indentLevel + 1, indentUnit);
		lines.push(...formatted);

		const next = statement.stmts[index + 1];
		if (next !== undefined && shouldInsertBlankLineBetween(child, next)) {
			lines.push('');
		}
	}

	lines.push(`${currentIndent}}`);
	return lines;
}

function formatNopStatement(
	statement: Extract<PhpStmt, { nodeType: 'Stmt_Nop' }>,
	indentLevel: number,
	indentUnit: string
): string[] {
	const comments = extractCommentTexts(statement);
	if (comments.length === 0) {
		return [`${indent(indentLevel, indentUnit)};`];
	}

	const currentIndent = indent(indentLevel, indentUnit);
	return comments.map((comment) => `${currentIndent}${comment}`);
}

function formatForeachStatement(
	statement: Extract<PhpStmt, { nodeType: 'Stmt_Foreach' }>,
	indentLevel: number,
	indentUnit: string
): string[] {
	const currentIndent = indent(indentLevel, indentUnit);
	const iterable = formatInlineExpression(statement.expr);
	const key = statement.keyVar
		? `${formatInlineExpression(statement.keyVar)} => `
		: '';
	const byRef = statement.byRef ? '&' : '';
	const value = formatInlineExpression(statement.valueVar);
	const lines = [
		`${currentIndent}foreach ( ${iterable} as ${key}${byRef}${value} ) {`,
	];

	for (let index = 0; index < statement.stmts.length; index += 1) {
		const child = statement.stmts[index]!;
		const formatted = formatStatement(child, indentLevel + 1, indentUnit);
		lines.push(...formatted);

		const next = statement.stmts[index + 1];
		if (next !== undefined && shouldInsertBlankLineBetween(child, next)) {
			lines.push('');
		}
	}

	lines.push(`${currentIndent}}`);
	return lines;
}

function formatAssignExpression(
	expression: PhpExprAssign,
	indentLevel: number,
	indentUnit: string
): string[] {
	const left = formatInlineExpression(expression.var);
	const right = formatExpression(expression.expr, indentLevel, indentUnit);
	if (right.length === 0) {
		return [`${indent(indentLevel, indentUnit)}${left} =`];
	}

	const [first, ...rest] = right;
	const baseIndent = indent(indentLevel, indentUnit);
	const firstLine = first ?? '';
	const firstRemainder = stripIndent(firstLine, baseIndent);
	const lines = [`${baseIndent}${left} = ${firstRemainder}`];
	lines.push(...rest);
	return lines;
}

function formatArrayExpression(
	expression: PhpExprArray,
	indentLevel: number,
	indentUnit: string
): string[] {
	if (expression.items.length === 0) {
		return [`${indent(indentLevel, indentUnit)}[]`];
	}

	const lines = [`${indent(indentLevel, indentUnit)}[`];

	for (const item of expression.items) {
		const itemLines = formatArrayItem(item, indentLevel + 1, indentUnit);
		if (itemLines.length > 0) {
			const lastIndex = itemLines.length - 1;
			itemLines[lastIndex] = `${itemLines[lastIndex]},`;
		}
		lines.push(...itemLines);
	}

	lines.push(`${indent(indentLevel, indentUnit)}]`);
	return lines;
}

function formatTernaryExpression(
	expression: ExtractExpr<'Expr_Ternary'>,
	indentLevel: number,
	indentUnit: string
): string[] {
	const baseIndent = indent(indentLevel, indentUnit);
	const condition = formatInlineExpression(expression.cond);
	const trueBranch = expression.if
		? formatInlineExpression(expression.if)
		: '';
	const falseBranch = formatInlineExpression(expression.else);

	if (expression.if) {
		return [`${baseIndent}${condition} ? ${trueBranch} : ${falseBranch}`];
	}

	return [`${baseIndent}${condition} ?: ${falseBranch}`];
}

function formatArrayItem(
	item: PhpExprArrayItem,
	indentLevel: number,
	indentUnit: string
): string[] {
	const valueLines = formatExpression(item.value, indentLevel, indentUnit);
	if (valueLines.length === 0) {
		return valueLines;
	}

	if (!item.key) {
		return valueLines;
	}

	const baseIndent = indent(indentLevel, indentUnit);
	const key = formatInlineExpression(item.key);
	const [first, ...rest] = valueLines;
	const firstLine = first ?? '';
	const remainder = stripIndent(firstLine, baseIndent);
	const lines = [`${baseIndent}${key} => ${remainder}`];
	lines.push(...rest);
	return lines;
}

function formatCastExpression(expr: ExtractExpr<CastNodeType>): string {
	const cast = CAST_TYPE_LABEL[expr.nodeType];
	return `(${cast}) ${formatInlineExpression(expr.expr)}`;
}

function formatInlineExpression(expr: PhpExpr | PhpName): string {
	if (isName(expr)) {
		return expr.parts.join('\\');
	}

	const formatter = INLINE_FORMATTERS[expr.nodeType];
	if (formatter) {
		return formatter(expr);
	}

	throw new Error(
		`Unsupported inline expression node for formatting: ${expr.nodeType}`
	);
}

function formatArguments(args: readonly PhpArg[]): string {
	return args.map((arg) => formatInlineExpression(arg.value)).join(', ');
}

function formatIdentifierOrExpr(
	value: PhpExpr | { nodeType: 'Identifier'; name: string }
): string {
	if (value.nodeType === 'Identifier') {
		return value.name;
	}

	return formatInlineExpression(value);
}

function formatBinaryOp(expression: PhpExprBinaryOp): string {
	const operator = mapBinaryOperator(expression.nodeType);
	return `${formatInlineExpression(expression.left)} ${operator} ${formatInlineExpression(
		expression.right
	)}`;
}

function mapBinaryOperator(nodeType: PhpExprBinaryOp['nodeType']): string {
	return (
		BINARY_OPERATOR_LABELS[nodeType] ??
		nodeType.replace('Expr_BinaryOp_', '')
	);
}

function formatNewExpression(expr: PhpExprNew): string {
	const className = formatInlineExpression(expr.class);
	const args = formatArguments(expr.args);
	return `new ${className}(${args})`;
}

function formatMatchExpression(expr: PhpExprMatch): string {
	const condition = formatInlineExpression(expr.cond);
	const arms = expr.arms.map((arm) => formatMatchArm(arm)).join(', ');
	return `match (${condition}) { ${arms} }`;
}

function formatMatchArm(arm: PhpMatchArm): string {
	const conditions =
		arm.conds && arm.conds.length > 0
			? arm.conds.map((cond) => formatInlineExpression(cond)).join(', ')
			: 'default';
	const body = formatInlineExpression(arm.body);
	return `${conditions} => ${body}`;
}

function formatArrowFunction(expr: PhpExprArrowFunction): string {
	const prefix = expr.static ? 'static ' : '';
	const ref = expr.byRef ? '&' : '';
	const params = formatParameterList(expr.params);
	const body = formatInlineExpression(expr.expr);
	return `${prefix}fn ${ref}${params} => ${body}`;
}

function formatInlineArray(expr: PhpExprArray): string {
	if (expr.items.length === 0) {
		return '[]';
	}

	const items = expr.items.map((item) => formatInlineArrayItem(item));
	return `[ ${items.join(', ')} ]`;
}

function formatInlineArrayItem(item: PhpExprArrayItem): string {
	const value = formatInlineExpression(item.value);
	if (!item.key) {
		return value;
	}

	const key = formatInlineExpression(item.key);
	return `${key} => ${value}`;
}

function formatParameterList(params: readonly PhpParam[]): string {
	if (params.length === 0) {
		return '()';
	}

	const formatted = params.map((param) => formatParameter(param));
	return `(${formatted.join(', ')})`;
}

function formatParameter(param: PhpParam): string {
	const parts: string[] = [];
	if (param.type) {
		parts.push(formatType(param.type));
	}

	const reference = param.byRef ? '&' : '';
	const variadic = param.variadic ? '...' : '';
	const name = formatInlineExpression(param.var);
	let result = `${reference}${variadic}${name}`;

	if (param.default) {
		result = `${result} = ${formatInlineExpression(param.default)}`;
	}

	if (parts.length > 0) {
		return `${parts.join(' ')} ${result}`;
	}

	return result;
}

function formatType(type: PhpType): string {
	switch (type.nodeType) {
		case 'Identifier':
			return type.name;
		case 'Name':
			return type.parts.join('\\');
		case 'NullableType':
			return `?${formatType(type.type)}`;
		case 'UnionType':
			return type.types.map((child) => formatType(child)).join(' | ');
		case 'IntersectionType':
			return type.types.map((child) => formatType(child)).join(' & ');
		default:
			throw new Error(
				`Unsupported type node for formatting: ${type.nodeType}`
			);
	}
}

function formatVariableName(variable: PhpExprVariable): string {
	if (typeof variable.name === 'string') {
		return `$${variable.name}`;
	}

	return `$${formatInlineExpression(variable.name)}`;
}

function indent(level: number, unit: string): string {
	if (level <= 0) {
		return '';
	}

	return unit.repeat(level);
}

function extractCommentTexts(statement: PhpStmt): string[] {
	const attributes = statement.attributes as {
		readonly comments?: ReadonlyArray<{ readonly text?: string }>;
	};

	if (!attributes?.comments || attributes.comments.length === 0) {
		return [];
	}

	return attributes.comments
		.map((comment) =>
			typeof comment.text === 'string' ? comment.text : undefined
		)
		.filter((comment): comment is string => Boolean(comment));
}

function stripIndent(value: string, prefix: string): string {
	if (prefix === '' || !value.startsWith(prefix)) {
		return value;
	}

	return value.slice(prefix.length);
}

function formatReturnStatement(
	statement: PhpStmtReturn,
	indentLevel: number,
	indentUnit: string
): string[] {
	const baseIndent = indent(indentLevel, indentUnit);

	if (!statement.expr) {
		return [`${baseIndent}return;`];
	}

	const expressionLines = formatExpression(
		statement.expr,
		indentLevel,
		indentUnit
	);
	if (expressionLines.length === 0) {
		return [`${baseIndent}return;`];
	}

	const [first, ...rest] = expressionLines;
	const firstLine = first ?? '';
	const firstRemainder = stripIndent(firstLine, baseIndent);
	const lines = [`${baseIndent}return ${firstRemainder}`];
	lines.push(...rest);
	lines[lines.length - 1] = `${lines[lines.length - 1]};`;
	return lines;
}

export function formatInlinePhpExpression(expr: PhpExpr): string {
	return formatInlineExpression(expr);
}

function needsBooleanNotParens(expr: PhpExpr): boolean {
	return BOOLEAN_NOT_PAREN_NODES.has(expr.nodeType);
}

function shouldInsertBlankLineBetween(
	current: PhpStmt,
	next: PhpStmt
): boolean {
	if (current.nodeType === 'Stmt_If' && next.nodeType === 'Stmt_Expression') {
		return true;
	}

	return false;
}

function isName(value: PhpExpr | PhpName): value is PhpName {
	return (
		value.nodeType === 'Name' ||
		value.nodeType === 'Name_FullyQualified' ||
		value.nodeType === 'Name_Relative'
	);
}
