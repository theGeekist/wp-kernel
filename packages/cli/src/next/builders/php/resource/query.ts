import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildPrintable,
	type PhpExprBinaryOp,
	type PhpStmtExpression,
	type PhpStmtIf,
	type PhpPrintable,
	type ResourceControllerCacheOperation,
	type ResourceControllerCacheScope,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT, buildWpQueryInstantiation } from '@wpkernel/php-json-ast';
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
	buildVariableAssignment,
	printStatement,
} from './utils';
import { createRequestParamAssignment } from './request';
import { formatExpression } from './printer';

export interface QueryArgEntry {
	readonly key: string;
	readonly value: PhpValueDescriptor;
}

export interface QueryArgsAssignmentOptions {
	readonly targetVariable: string;
	readonly entries: readonly QueryArgEntry[];
	readonly indentLevel?: number;
}

export function createQueryArgsAssignment(
	options: QueryArgsAssignmentOptions
): PhpPrintable<PhpStmtExpression> {
	const { targetVariable, entries, indentLevel = 0 } = options;
	const target = normaliseVariableReference(targetVariable);
	const items = entries.map((entry) => {
		const rendered = renderPhpValue(entry.value, indentLevel + 1);
		return buildArrayItem(rendered.node, {
			key: buildScalarString(entry.key),
		});
	});

	const statement = buildVariableAssignment(target, buildArray(items));

	return printStatement(statement, indentLevel);
}

export interface PaginationNormalisationOptions {
	readonly requestVariable: string;
	readonly targetVariable: string;
	readonly param?: string;
	readonly defaultValue?: number;
	readonly maximum?: number;
	readonly nonPositiveGuard?: number;
	readonly indentLevel?: number;
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
	} = options;

	const target = normaliseVariableReference(targetVariable);
	const assignment = createRequestParamAssignment({
		requestVariable,
		param,
		targetVariable,
		cast: 'int',
		indentLevel,
	});

	const ensurePositive = createConditionalAssignment({
		variable: target,
		operator: 'SmallerOrEqual',
		comparison: nonPositiveGuard,
		assignment: defaultValue,
		indentLevel,
	});

	const clampMaximum = createConditionalAssignment({
		variable: target,
		operator: 'Greater',
		comparison: maximum,
		assignment: maximum,
		indentLevel,
	});

	return [assignment, ensurePositive, clampMaximum];
}

interface ConditionalAssignmentOptions {
	readonly variable: ReturnType<typeof normaliseVariableReference>;
	readonly operator: 'SmallerOrEqual' | 'Greater';
	readonly comparison: number;
	readonly assignment: number;
	readonly indentLevel: number;
}

function createConditionalAssignment(
	options: ConditionalAssignmentOptions
): PhpPrintable<PhpStmtIf> {
	const { variable, operator, comparison, assignment, indentLevel } = options;
	const condition = buildBinaryOperation(
		operator,
		buildVariable(variable.raw),
		buildScalarInt(comparison)
	);

	const assignStatement = buildVariableAssignment(
		variable,
		buildScalarInt(assignment)
	);
	const ifNode = buildIfStatement(condition as PhpExprBinaryOp, [
		assignStatement,
	]);

	return printStatement(ifNode, indentLevel);
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

	const lines = formatExpression(funcCall, 0, PHP_INDENT);
	return expression(buildPrintable(funcCall, lines));
}

export interface ExecuteWpQueryOptions {
	readonly target: string;
	readonly argsVariable: string;
	readonly indentLevel?: number;
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
	const { target, argsVariable, indentLevel, cache } = options;

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
		indentUnit: PHP_INDENT,
	});
}
