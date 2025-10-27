import { WPKernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildContinue,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	buildWpTermQueryInstantiation,
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import {
	buildPaginationNormalisationStatements,
	buildQueryArgsAssignmentStatement,
} from '../query';
import { buildRequestParamAssignmentStatement } from '../request';
import { variable } from '../phpValue';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildIfStatementNode,
	buildInstanceof,
	buildScalarCast,
} from '../utils';
import { buildReturnIfWpError } from '../errors';
import { buildListItemsInitialiserStatement } from '../wpPost/list';
import type { IRResource } from '../../../../ir/publicTypes';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildTaxonomyAssignmentStatement,
} from './helpers';

type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface BuildWpTaxonomyListRouteStatementsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildWpTaxonomyListRouteStatements(
	options: BuildWpTaxonomyListRouteStatementsOptions
): PhpStmt[] {
	ensureStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'list',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'List terms query',
	});

	const statements: PhpStmt[] = [];

	statements.push(
		buildTaxonomyAssignmentStatement({
			pascalName: options.pascalName,
		})
	);

	const [perPageAssign, ensurePositive, clampMaximum] =
		buildPaginationNormalisationStatements({
			requestVariable: '$request',
			targetVariable: 'per_page',
		});
	statements.push(perPageAssign, ensurePositive, clampMaximum);
	statements.push(buildBlankStatement());

	const pageAssign = buildRequestParamAssignmentStatement({
		requestVariable: '$request',
		param: 'page',
		targetVariable: 'page',
		cast: 'int',
	});
	statements.push(pageAssign);

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
	statements.push(pageGuard);
	statements.push(buildBlankStatement());

	const queryArgsAssignment = buildQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: [
			{ key: 'taxonomy', value: variable('taxonomy') },
			{ key: 'hide_empty', value: false },
		],
	});
	statements.push(queryArgsAssignment);
	statements.push(buildBlankStatement());

	statements.push(...buildExtraArgsMergeStatements());

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('number')),
				buildVariable('per_page')
			)
		)
	);
	statements.push(
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
		)
	);
	statements.push(buildBlankStatement());

	statements.push(
		buildWpTermQueryInstantiation({
			target: 'term_query',
			argsVariable: 'query_args',
		})
	);

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('results'),
				buildMethodCall(
					buildVariable('term_query'),
					buildIdentifier('query'),
					[buildArg(buildVariable('query_args'))]
				)
			)
		)
	);

	statements.push(buildReturnIfWpError(buildVariable('results')));
	statements.push(buildBlankStatement());

	statements.push(buildListItemsInitialiserStatement());

	statements.push(
		buildResultsForeach({
			pascalName: options.pascalName,
		})
	);
	statements.push(buildBlankStatement());

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('count_query_args'),
				buildVariable('query_args')
			)
		)
	);

	statements.push(
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

	statements.push(
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

	statements.push(
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
	statements.push(buildBlankStatement());

	statements.push(
		buildWpTermQueryInstantiation({
			target: 'count_query',
			argsVariable: 'count_query_args',
		})
	);

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('total'),
				buildScalarCast(
					'int',
					buildMethodCall(
						buildVariable('count_query'),
						buildIdentifier('query'),
						[buildArg(buildVariable('count_query_args'))]
					)
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
	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('pages'), pagesExpression)
		)
	);
	statements.push(buildBlankStatement());

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

function buildExtraArgsMergeStatements(): PhpStmt[] {
	const statements: PhpStmt[] = [];

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('extra_args'),
				buildMethodCall(
					buildVariable('request'),
					buildIdentifier('get_params'),
					[]
				)
			)
		)
	);

	const skipArray = buildArray([
		buildArrayItem(buildScalarString('page')),
		buildArrayItem(buildScalarString('per_page')),
		buildArrayItem(buildScalarString('taxonomy')),
		buildArrayItem(buildScalarString('hide_empty')),
	]);

	const guard = buildIfStatementNode({
		condition: buildFuncCall(buildName(['in_array']), [
			buildArg(buildVariable('key')),
			buildArg(skipArray),
			buildArg(buildScalarBool(true)),
		]),
		statements: [buildContinueStatement()],
	});

	const assign = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('query_args', buildVariable('key')),
			buildVariable('value')
		)
	);

	statements.push(
		buildForeach(buildVariable('extra_args'), {
			valueVar: buildVariable('value'),
			keyVar: buildVariable('key'),
			stmts: [guard, assign],
		})
	);

	statements.push(buildBlankStatement());

	return statements;
}

function buildResultsForeach(options: {
	readonly pascalName: string;
}): PhpStmtForeach {
	const appendStatement = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('items', null),
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term')
		)
	);

	const guard = buildIfStatementNode({
		condition: buildInstanceof('term', 'WP_Term'),
		statements: [appendStatement],
	});

	return buildForeach(buildVariable('results'), {
		valueVar: buildVariable('term'),
		keyVar: null,
		stmts: [guard],
	});
}

function buildContinueStatement(): PhpStmtContinue {
	return buildContinue();
}

function buildBlankStatement(): PhpStmt {
	return buildStmtNop();
}

function ensureStorage(resource: IRResource): WpTaxonomyStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-taxonomy') {
		throw new WPKernelError('DeveloperError', {
			message: 'Resource must use wp-taxonomy storage.',
			context: { name: resource.name },
		});
	}
	return storage;
}
