import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpStmtContinue,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import {
	createPaginationNormalisationStatements,
	createQueryArgsAssignmentStatement,
} from '../query';
import { createRequestParamAssignmentStatement } from '../request';
import {
	buildArrayDimFetch,
	buildArrayInitialiserStatement,
	buildBinaryOperation,
	buildForeachStatement,
	buildIfStatementNode,
	buildInstanceof,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../utils';
import { variable } from '../phpValue';
import type { IRResource } from '../../../../../ir/types';
import {
	buildPrepareTaxonomyTermResponseCall,
	createTaxonomyAssignmentStatement,
} from './helpers';
import { buildWpTermQueryInstantiation } from '@wpkernel/php-json-ast';

type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface BuildWpTaxonomyListRouteBodyOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildWpTaxonomyListRouteBody(
	options: BuildWpTaxonomyListRouteBodyOptions
): boolean {
	ensureStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'list',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'List terms query',
	});

	options.body.statementNode(
		createTaxonomyAssignmentStatement({
			pascalName: options.pascalName,
		})
	);

	const [perPageAssign, ensurePositive, clampMaximum] =
		createPaginationNormalisationStatements({
			requestVariable: '$request',
			targetVariable: 'per_page',
		});
	options.body.statementNode(perPageAssign);
	options.body.statementNode(ensurePositive);
	options.body.statementNode(clampMaximum);

	options.body.statementNode(
		createRequestParamAssignmentStatement({
			requestVariable: '$request',
			param: 'page',
			targetVariable: 'page',
			cast: 'int',
		})
	);

	options.body.statementNode(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'SmallerOrEqual',
				buildVariable('page'),
				buildScalarInt(0)
			),
			statements: [
				buildVariableAssignment(
					normaliseVariableReference('page'),
					buildScalarInt(1)
				),
			],
		})
	);

	const queryArgs = createQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: [
			{ key: 'taxonomy', value: variable('taxonomy') },
			{ key: 'hide_empty', value: false },
		],
	});
	options.body.statementNode(queryArgs);

	appendExtraArgsMerge(options);

	options.body.statementNode(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('number')),
				buildVariable('per_page')
			)
		)
	);

	const offsetExpression = buildBinaryOperation(
		'Mul',
		buildBinaryOperation('Minus', buildVariable('page'), buildScalarInt(1)),
		buildVariable('per_page')
	);
	options.body.statementNode(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('offset')),
				offsetExpression
			)
		)
	);

	options.body.statementNode(
		buildWpTermQueryInstantiation({ target: 'term_query' })
	);

	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('results'),
			buildMethodCall(
				buildVariable('term_query'),
				buildIdentifier('query'),
				[buildArg(buildVariable('query_args'))]
			)
		)
	);

	options.body.statementNode(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_wp_error']), [
				buildArg(buildVariable('results')),
			]),
			statements: [buildReturn(buildVariable('results'))],
		})
	);

	options.body.statementNode(
		buildArrayInitialiserStatement({ variable: 'items' })
	);

	options.body.statementNode(buildResultsForeach(options.pascalName));

	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('count_query_args'),
			buildVariable('query_args')
		)
	);

	options.body.statementNode(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('count')
				),
				buildScalarBool(true)
			)
		)
	);

	options.body.statementNode(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('number')
				),
				buildScalarInt(0)
			)
		)
	);

	options.body.statementNode(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('offset')
				),
				buildScalarInt(0)
			)
		)
	);

	options.body.statementNode(
		buildWpTermQueryInstantiation({ target: 'count_query' })
	);

	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('total'),
			buildScalarCast(
				'int',
				buildMethodCall(
					buildVariable('count_query'),
					buildIdentifier('query'),
					[buildArg(buildVariable('count_query_args'))]
				)
			)
		)
	);

	const pagesExpression = buildScalarCast(
		'int',
		buildFuncCall(buildName(['ceil']), [
			buildArg(
				buildBinaryOperation(
					'Div',
					buildVariable('total'),
					buildFuncCall(buildName(['max']), [
						buildArg(buildScalarInt(1)),
						buildArg(buildVariable('per_page')),
					])
				)
			),
		])
	);

	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('pages'),
			pagesExpression
		)
	);

	options.body.statementNode(
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

	return true;
}

function appendExtraArgsMerge(options: {
	readonly body: PhpMethodBodyBuilder;
}): void {
	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('extra_args'),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_params'),
				[]
			)
		)
	);

	const skipArray = buildArray([
		buildArrayItem(buildScalarString('page')),
		buildArrayItem(buildScalarString('per_page')),
		buildArrayItem(buildScalarString('taxonomy')),
		buildArrayItem(buildScalarString('hide_empty')),
	]);

	const continueStatement = buildNode<PhpStmtContinue>('Stmt_Continue', {
		num: null,
	});

	const foreach = buildForeachStatement({
		iterable: buildVariable('extra_args'),
		key: 'key',
		value: 'value',
		statements: [
			buildIfStatementNode({
				condition: buildFuncCall(buildName(['in_array']), [
					buildArg(buildVariable('key')),
					buildArg(skipArray),
					buildArg(buildScalarBool(true)),
				]),
				statements: [continueStatement],
			}),
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('query_args', buildVariable('key')),
					buildVariable('value')
				)
			),
		],
	});

	options.body.statementNode(foreach);
}

function buildResultsForeach(pascalName: string) {
	const foreach = buildForeachStatement({
		iterable: buildVariable('results'),
		value: 'term',
		statements: [
			buildIfStatementNode({
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch('items', null),
							buildPrepareTaxonomyTermResponseCall(
								pascalName,
								'term'
							)
						)
					),
				],
			}),
		],
	});

	return foreach;
}

function ensureStorage(resource: IRResource): WpTaxonomyStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-taxonomy') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-taxonomy storage.',
			context: { name: resource.name },
		});
	}
	return storage;
}
