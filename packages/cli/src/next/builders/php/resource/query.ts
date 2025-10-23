import {
	createArg,
	createAssign,
	createArray,
	createArrayItem,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNode,
	createScalarInt,
	createScalarString,
	createVariable,
	type PhpExprBinaryOp,
	type PhpStmtExpression,
	type PhpStmtIf,
	createPrintable,
	type PhpPrintable,
	type ResourceControllerCacheOperation,
	type ResourceControllerCacheScope,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	createWpQueryInstantiation,
	escapeSingleQuotes,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from './cache';
import {
	expression,
	renderPhpValue,
	type PhpValueDescriptor,
} from './phpValue';
import {
	buildScalarCast,
	normaliseVariableReference,
	buildBinaryOperation,
} from './utils';
import { createRequestParamAssignment } from './request';

export interface QueryArgEntry {
	readonly key: string;
	readonly value: PhpValueDescriptor;
}

export interface QueryArgsAssignmentOptions {
	readonly targetVariable: string;
	readonly entries: readonly QueryArgEntry[];
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createQueryArgsAssignment(
	options: QueryArgsAssignmentOptions
): PhpPrintable<PhpStmtExpression> {
	const {
		targetVariable,
		entries,
		indentLevel = 0,
		indentUnit = PHP_INDENT,
	} = options;
	const target = normaliseVariableReference(targetVariable);
	const indent = indentUnit.repeat(indentLevel);
	const childIndent = indentUnit.repeat(indentLevel + 1);

	const items: ReturnType<typeof createArrayItem>[] = [];
	const lines: string[] = [`${indent}${target.display} = [`];

	for (const entry of entries) {
		const rendered = renderPhpValue(
			entry.value,
			indentLevel + 1,
			indentUnit
		);
		const childLines = [...rendered.lines];
		const firstLine = childLines[0] ?? `${childIndent}null`;
		const remainder = firstLine.slice(childIndent.length);
		childLines[0] = `${childIndent}'${escapeSingleQuotes(entry.key)}' => ${remainder}`;
		const lastIndex = childLines.length - 1;
		childLines[lastIndex] = `${childLines[lastIndex]},`;
		lines.push(...childLines);
		items.push(
			createArrayItem(rendered.node, {
				key: createScalarString(entry.key),
			})
		);
	}

	lines.push(`${indent}];`);

	const assign = createAssign(createVariable(target.raw), createArray(items));
	const statement = createExpressionStatement(assign);

	return createPrintable(statement, lines);
}

export interface PaginationNormalisationOptions {
	readonly requestVariable: string;
	readonly targetVariable: string;
	readonly param?: string;
	readonly defaultValue?: number;
	readonly maximum?: number;
	readonly nonPositiveGuard?: number;
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createPaginationNormalisation(
	options: PaginationNormalisationOptions
): readonly [
	PhpPrintable<PhpStmtExpression>,
	PhpPrintable<PhpStmtIf>,
	PhpPrintable<PhpStmtIf>,
] {
	const {
		requestVariable,
		targetVariable,
		param = 'per_page',
		defaultValue = 10,
		maximum = 100,
		nonPositiveGuard = 0,
		indentLevel = 0,
		indentUnit = PHP_INDENT,
	} = options;

	const target = normaliseVariableReference(targetVariable);
	const assignment = createRequestParamAssignment({
		requestVariable,
		param,
		targetVariable,
		cast: 'int',
		indentLevel,
		indentUnit,
	});

	const ensurePositive = createConditionalAssignment({
		variable: target,
		operator: 'SmallerOrEqual',
		comparison: nonPositiveGuard,
		assignment: defaultValue,
		indentLevel,
		indentUnit,
	});

	const clampMaximum = createConditionalAssignment({
		variable: target,
		operator: 'Greater',
		comparison: maximum,
		assignment: maximum,
		indentLevel,
		indentUnit,
	});

	return [assignment, ensurePositive, clampMaximum];
}

interface ConditionalAssignmentOptions {
	readonly variable: ReturnType<typeof normaliseVariableReference>;
	readonly operator: 'SmallerOrEqual' | 'Greater';
	readonly comparison: number;
	readonly assignment: number;
	readonly indentLevel: number;
	readonly indentUnit: string;
}

function createConditionalAssignment(
	options: ConditionalAssignmentOptions
): PhpPrintable<PhpStmtIf> {
	const {
		variable,
		operator,
		comparison,
		assignment,
		indentLevel,
		indentUnit,
	} = options;
	const indent = indentUnit.repeat(indentLevel);
	const bodyIndent = indentUnit.repeat(indentLevel + 1);

	const condition = buildBinaryOperation(
		operator,
		createVariable(variable.raw),
		createScalarInt(comparison)
	);

	const assign = createAssign(
		createVariable(variable.raw),
		createScalarInt(assignment)
	);
	const statement = createExpressionStatement(assign);
	const ifNode = createNode<PhpStmtIf>('Stmt_If', {
		cond: condition as PhpExprBinaryOp,
		stmts: [statement],
		elseifs: [],
		else: null,
	});

	const comparisonSymbol = operator === 'Greater' ? '>' : '<=';
	const lines = [
		`${indent}if ( ${variable.display} ${comparisonSymbol} ${comparison} ) {`,
		`${bodyIndent}${variable.display} = ${assignment};`,
		`${indent}}`,
	];

	return createPrintable(ifNode, lines);
}

export interface PageExpressionOptions {
	readonly requestVariable: string;
	readonly param?: string;
	readonly minimum?: number;
}

export function createPageExpression(
	options: PageExpressionOptions
): PhpValueDescriptor {
	const { requestVariable, param = 'page', minimum = 1 } = options;
	const request = normaliseVariableReference(requestVariable);

	const methodCall = createMethodCall(
		createVariable(request.raw),
		createIdentifier('get_param'),
		[createArg(createScalarString(param))]
	);

	const cast = buildScalarCast('int', methodCall);
	const funcCall = createFuncCall(createName(['max']), [
		createArg(createScalarInt(minimum)),
		createArg(cast),
	]);

	const line = `max( ${minimum}, (int) ${request.display}->get_param( '${param}' ) )`;
	return expression(createPrintable(funcCall, [line]));
}

export interface ExecuteWpQueryOptions {
	readonly target: string;
	readonly argsVariable: string;
	readonly indentLevel?: number;
	readonly indentUnit?: string;
	readonly cache?: {
		readonly host: ResourceMetadataHost;
		readonly scope: ResourceControllerCacheScope;
		readonly operation: ResourceControllerCacheOperation;
		readonly segments: readonly unknown[];
		readonly description?: string;
	};
}

export function createWpQueryExecution(
	options: ExecuteWpQueryOptions
): PhpPrintable<PhpStmtExpression> {
	const { target, argsVariable, indentLevel, indentUnit, cache } = options;

	if (cache) {
		appendResourceCacheEvent({
			host: cache.host,
			scope: cache.scope,
			operation: cache.operation,
			segments: cache.segments,
			description: cache.description,
		});
	}

	return createWpQueryInstantiation({
		target,
		argsVariable,
		indentLevel,
		indentUnit,
	});
}
