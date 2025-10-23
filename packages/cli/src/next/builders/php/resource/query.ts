import {
	buildArg,
	buildAssign,
	buildArray,
	buildArrayItem,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExprBinaryOp,
	type PhpStmtExpression,
	type PhpStmtIf,
	buildPrintable,
	type PhpPrintable,
	type ResourceControllerCacheOperation,
	type ResourceControllerCacheScope,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	buildWpQueryInstantiation,
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

	const items: ReturnType<typeof buildArrayItem>[] = [];
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
			buildArrayItem(rendered.node, {
				key: buildScalarString(entry.key),
			})
		);
	}

	lines.push(`${indent}];`);

	const assign = buildAssign(buildVariable(target.raw), buildArray(items));
	const statement = buildExpressionStatement(assign);

	return buildPrintable(statement, lines);
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
		buildVariable(variable.raw),
		buildScalarInt(comparison)
	);

	const assign = buildAssign(
		buildVariable(variable.raw),
		buildScalarInt(assignment)
	);
	const statement = buildExpressionStatement(assign);
	const ifNode = buildNode<PhpStmtIf>('Stmt_If', {
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

	return buildPrintable(ifNode, lines);
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

	const methodCall = buildMethodCall(
		buildVariable(request.raw),
		buildIdentifier('get_param'),
		[buildArg(buildScalarString(param))]
	);

	const cast = buildScalarCast('int', methodCall);
	const funcCall = buildFuncCall(buildName(['max']), [
		buildArg(buildScalarInt(minimum)),
		buildArg(cast),
	]);

	const line = `max( ${minimum}, (int) ${request.display}->get_param( '${param}' ) )`;
	return expression(buildPrintable(funcCall, [line]));
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

	return buildWpQueryInstantiation({
		target,
		argsVariable,
		indentLevel,
		indentUnit,
	});
}
