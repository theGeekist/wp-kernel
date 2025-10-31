import type { ResourceStorageConfig } from '@wpkernel/core/resource';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildContinue,
	type PhpStmt,
	type PhpStmtForeach,
} from '@wpkernel/php-json-ast';

import {
	appendStatementsWithSpacing,
	buildArrayDimFetch,
	buildArrayInitialiserStatement,
	buildBinaryOperation,
	buildForeachStatement,
	buildFunctionCall,
	buildIfStatementNode,
	buildInstanceof,
	buildMethodCallExpression,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../common/utils';
import { buildRequestParamAssignmentStatement } from '../../../common/request';
import { variable } from '../../common/phpValue';
import {
	buildPaginationNormalisationStatements,
	buildQueryArgsAssignmentStatement,
} from '../../query';
import { buildReturnIfWpError } from '../../errors';
import { buildCacheInvalidators, type ResourceMetadataHost } from '../../cache';
import { buildWpTermQueryInstantiation } from '../../../factories/wpTermQuery';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildTaxonomyAssignmentStatement,
	ensureWpTaxonomyStorage,
} from '../helpers';

export interface BuildWpTaxonomyListRouteStatementsOptions {
	readonly pascalName: string;
	readonly storage: ResourceStorageConfig | undefined;
	readonly resourceName?: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
	readonly requestVariable?: string;
	readonly taxonomyVariable?: string;
}

export function buildWpTaxonomyListRouteStatements(
	options: BuildWpTaxonomyListRouteStatementsOptions
): PhpStmt[] {
	ensureWpTaxonomyStorage(options.storage, {
		resourceName: options.resourceName,
	});

	registerListCacheInvalidation(options.metadataHost, options.cacheSegments);

	const statements: PhpStmt[] = [];

	const taxonomyVariable = options.taxonomyVariable ?? 'taxonomy';

	appendStatementsWithSpacing(statements, [
		buildTaxonomyAssignmentStatement({
			pascalName: options.pascalName,
			targetVariable: taxonomyVariable,
		}),
	]);

	const requestVariable = options.requestVariable ?? '$request';
	const [perPageAssign, ensurePositive, clampMaximum] =
		buildPaginationNormalisationStatements({
			requestVariable,
			targetVariable: 'per_page',
		});
	appendStatementsWithSpacing(statements, [
		perPageAssign,
		ensurePositive,
		clampMaximum,
	]);

	const pageAssign = buildRequestParamAssignmentStatement({
		requestVariable,
		param: 'page',
		targetVariable: 'page',
		cast: 'int',
	});
	const pageGuard = buildIfStatementNode({
		condition: buildBinaryOperation(
			'SmallerOrEqual',
			buildVariable('page'),
			buildScalarInt(0)
		),
		statements: [
			buildExpressionStatement(
				buildAssign(buildVariable('page'), buildScalarInt(1))
			),
		],
	});
	appendStatementsWithSpacing(statements, [pageAssign, pageGuard]);

	const queryArgsAssignment = buildQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: [
			{
				key: 'taxonomy',
				value: variable(taxonomyVariable),
			},
			{ key: 'hide_empty', value: false },
		],
	});
	appendStatementsWithSpacing(statements, [queryArgsAssignment]);

	appendStatementsWithSpacing(
		statements,
		buildExtraArgsMergeStatements({ requestVariable })
	);

	appendStatementsWithSpacing(statements, [
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('number')),
				buildVariable('per_page')
			)
		),
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('offset')),
				buildBinaryOperation(
					'Mul',
					buildBinaryOperation(
						'Minus',
						buildVariable('page'),
						buildScalarInt(1)
					),
					buildVariable('per_page')
				)
			)
		),
	]);

	appendStatementsWithSpacing(statements, [
		buildWpTermQueryInstantiation({
			target: 'term_query',
			argsVariable: 'query_args',
		}),
	]);

	const resultsAssignment = buildExpressionStatement(
		buildAssign(
			buildVariable('results'),
			buildMethodCallExpression({
				subject: 'term_query',
				method: 'query',
				args: [buildArg(buildVariable('query_args'))],
			})
		)
	);
	appendStatementsWithSpacing(statements, [
		resultsAssignment,
		buildReturnIfWpError(buildVariable('results')),
	]);

	appendStatementsWithSpacing(statements, [
		buildArrayInitialiserStatement({ variable: 'items' }),
	]);

	appendStatementsWithSpacing(statements, [
		buildResultsForeach({ pascalName: options.pascalName }),
	]);

	appendStatementsWithSpacing(statements, [
		buildVariableAssignment(
			normaliseVariableReference('count_query_args'),
			buildVariable('query_args')
		),
	]);

	appendStatementsWithSpacing(statements, [
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('count')
				),
				buildScalarBool(true)
			)
		),
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('number')
				),
				buildScalarInt(0)
			)
		),
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('offset')
				),
				buildScalarInt(0)
			)
		),
	]);

	appendStatementsWithSpacing(statements, [
		buildWpTermQueryInstantiation({
			target: 'count_query',
			argsVariable: 'count_query_args',
		}),
	]);

	const totalAssignment = buildExpressionStatement(
		buildAssign(
			buildVariable('total'),
			buildScalarCast(
				'int',
				buildMethodCallExpression({
					subject: 'count_query',
					method: 'query',
					args: [buildArg(buildVariable('count_query_args'))],
				})
			)
		)
	);
	appendStatementsWithSpacing(statements, [totalAssignment]);

	const pagesExpression = buildScalarCast(
		'int',
		buildFunctionCall('ceil', [
			buildArg(
				buildBinaryOperation(
					'Div',
					buildVariable('total'),
					buildFunctionCall('max', [
						buildArg(buildScalarInt(1)),
						buildArg(buildVariable('per_page')),
					])
				)
			),
		])
	);
	appendStatementsWithSpacing(statements, [
		buildExpressionStatement(
			buildAssign(buildVariable('pages'), pagesExpression)
		),
	]);

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable('items'), {
					key: buildScalarString('items'),
				}),
				buildArrayItem(buildVariable('total'), {
					key: buildScalarString('total'),
				}),
				buildArrayItem(buildVariable('pages'), {
					key: buildScalarString('pages'),
				}),
			])
		)
	);

	return statements;
}

interface ExtraArgsMergeOptions {
	readonly requestVariable: string;
}

function buildExtraArgsMergeStatements(
	options: ExtraArgsMergeOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [];

	const request = normaliseVariableReference(options.requestVariable);
	const extraArgsVar = normaliseVariableReference('extra_args');

	statements.push(
		buildVariableAssignment(
			extraArgsVar,
			buildMethodCallExpression({
				subject: request.display,
				method: 'get_params',
			})
		)
	);

	const skipArray = buildArray([
		buildArrayItem(buildScalarString('page')),
		buildArrayItem(buildScalarString('per_page')),
		buildArrayItem(buildScalarString('taxonomy')),
		buildArrayItem(buildScalarString('hide_empty')),
	]);

	const guard = buildIfStatementNode({
		condition: buildFunctionCall('in_array', [
			buildArg(buildVariable('key')),
			buildArg(skipArray),
			buildArg(buildScalarBool(true)),
		]),
		statements: [buildContinue()],
	});

	const assign = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('query_args', buildVariable('key')),
			buildVariable('value')
		)
	);

	statements.push(
		buildForeachStatement({
			iterable: buildVariable(extraArgsVar.raw),
			key: 'key',
			value: 'value',
			statements: [guard, assign],
		})
	);

	return statements;
}

interface ResultsForeachOptions {
	readonly pascalName: string;
}

function buildResultsForeach(options: ResultsForeachOptions): PhpStmtForeach {
	const guard = buildIfStatementNode({
		condition: buildInstanceof('term', 'WP_Term'),
		statements: [
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('items', null),
					buildPrepareTaxonomyTermResponseCall(
						options.pascalName,
						'term'
					)
				)
			),
		],
	});

	return buildForeachStatement({
		iterable: buildVariable('results'),
		key: null,
		value: 'term',
		statements: [guard],
	});
}

function registerListCacheInvalidation(
	host: ResourceMetadataHost,
	segments: readonly unknown[]
): void {
	buildCacheInvalidators({
		host,
		events: [
			{
				scope: 'list',
				operation: 'read',
				segments,
				description: 'List terms query',
			},
		],
	});
}
