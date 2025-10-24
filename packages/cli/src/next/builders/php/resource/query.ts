import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExprBinaryOp,
	type PhpExprNew,
	type PhpStmtExpression,
	type PhpStmtIf,
	type ResourceControllerCacheOperation,
	type ResourceControllerCacheScope,
	type ResourceMetadataHost,
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
	buildVariableAssignment,
	buildIfStatementNode,
} from './utils';
import { createRequestParamAssignmentStatement } from './request';

export interface QueryArgEntry {
	readonly key: string;
	readonly value: PhpValueDescriptor;
}

export interface QueryArgsAssignmentOptions {
	readonly targetVariable: string;
	readonly entries: readonly QueryArgEntry[];
}

export function createQueryArgsAssignmentStatement(
	options: QueryArgsAssignmentOptions
): PhpStmtExpression {
	const { targetVariable, entries } = options;
	const target = normaliseVariableReference(targetVariable);
	const items = entries.map((entry) => {
		const rendered = renderPhpValue(entry.value);
		return buildArrayItem(rendered, {
			key: buildScalarString(entry.key),
		});
	});

	return buildVariableAssignment(target, buildArray(items));
}

export interface PaginationNormalisationOptions {
	readonly requestVariable: string;
	readonly targetVariable: string;
	readonly param?: string;
	readonly defaultValue?: number;
	readonly maximum?: number;
	readonly nonPositiveGuard?: number;
}

export function createPaginationNormalisationStatements(
	options: PaginationNormalisationOptions
): readonly [PhpStmtExpression, PhpStmtIf, PhpStmtIf] {
	const {
		requestVariable,
		targetVariable,
		param = 'per_page',
		defaultValue = 10,
		maximum = 100,
		nonPositiveGuard = 0,
	} = options;

	const target = normaliseVariableReference(targetVariable);
	const assignment = createRequestParamAssignmentStatement({
		requestVariable,
		param,
		targetVariable,
		cast: 'int',
	});

	const ensurePositive = createConditionalAssignment({
		variable: target,
		operator: 'SmallerOrEqual',
		comparison: nonPositiveGuard,
		assignment: defaultValue,
	});

	const clampMaximum = createConditionalAssignment({
		variable: target,
		operator: 'Greater',
		comparison: maximum,
		assignment: maximum,
	});

	return [assignment, ensurePositive, clampMaximum];
}

interface ConditionalAssignmentOptions {
	readonly variable: ReturnType<typeof normaliseVariableReference>;
	readonly operator: 'SmallerOrEqual' | 'Greater';
	readonly comparison: number;
	readonly assignment: number;
}

function createConditionalAssignment(
	options: ConditionalAssignmentOptions
): PhpStmtIf {
	const { variable, operator, comparison, assignment } = options;
	const condition = buildBinaryOperation(
		operator,
		buildVariable(variable.raw),
		buildScalarInt(comparison)
	);

	const assignStatement = buildVariableAssignment(
		variable,
		buildScalarInt(assignment)
	);
	return buildIfStatementNode({
		condition: condition as PhpExprBinaryOp,
		statements: [assignStatement],
	});
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

	return expression(funcCall);
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

export function createWpQueryExecutionStatement(
	options: ExecuteWpQueryOptions
): PhpStmtExpression {
	const { target, argsVariable, cache } = options;

	if (cache) {
		appendResourceCacheEvent({
			host: cache.host,
			scope: cache.scope,
			operation: cache.operation,
			segments: cache.segments,
			description: cache.description,
		});
	}

	const targetRef = normaliseVariableReference(target);
	const argsRef = normaliseVariableReference(argsVariable);
	const instantiation = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Query']),
		args: [buildArg(buildVariable(argsRef.raw))],
	});

	return buildVariableAssignment(targetRef, instantiation);
}
