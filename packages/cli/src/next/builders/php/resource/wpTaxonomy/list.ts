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
	type PhpStmtForeach,
	type PhpStmtExpression,
	type PhpStmtReturn,
	type PhpPrintable,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
	type PhpExpr,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import {
	createPaginationNormalisation,
	createQueryArgsAssignment,
	createRequestParamAssignment,
	buildIfPrintable,
} from '../printable';
import { variable } from '../phpValue';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildInstanceof,
	buildScalarCast,
} from '../utils';
import { buildListItemsInitialiserStatement } from '../wpPost/list';
import { buildWpTermQueryInstantiation } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import { formatStatementPrintable } from '../printer';
import {
	createTaxonomyAssignmentPrintable,
	buildPrepareTaxonomyTermResponseCall,
} from './helpers';

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

	const indentLevel = options.indentLevel;

	options.body.statement(
		createTaxonomyAssignmentPrintable({
			pascalName: options.pascalName,
			indentLevel,
		})
	);

	const [perPageAssign, ensurePositive, clampMaximum] =
		createPaginationNormalisation({
			requestVariable: '$request',
			targetVariable: 'per_page',
			indentLevel,
		});
	options.body.statement(perPageAssign);
	options.body.statement(ensurePositive);
	options.body.statement(clampMaximum);
	options.body.blank();

	const pageAssign = createRequestParamAssignment({
		requestVariable: '$request',
		param: 'page',
		targetVariable: 'page',
		cast: 'int',
		indentLevel,
	});
	options.body.statement(pageAssign);

	const pageGuard = buildIfPrintable({
		indentLevel,
		condition: buildBinaryOperation(
			'SmallerOrEqual',
			buildVariable('page'),
			buildScalarInt(0)
		),
		statements: [
			createExpressionPrintable(
				buildAssign(buildVariable('page'), buildScalarInt(1)),
				indentLevel + 1
			),
		],
	});
	options.body.statement(pageGuard);
	options.body.blank();

	options.body.statement(
		createQueryArgsAssignment({
			targetVariable: 'query_args',
			entries: [
				{ key: 'taxonomy', value: variable('taxonomy') },
				{ key: 'hide_empty', value: false },
			],
			indentLevel,
		})
	);
	options.body.blank();

	appendExtraArgsMerge({
		body: options.body,
		indentLevel,
	});

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('number')),
				buildVariable('per_page')
			),
			indentLevel
		)
	);
	options.body.statement(
		createExpressionPrintable(
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
			),
			indentLevel
		)
	);
	options.body.blank();

	options.body.statement(
		buildWpTermQueryInstantiation({
			target: 'term_query',
			indentLevel,
		})
	);

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildVariable('results'),
				buildMethodCall(
					buildVariable('term_query'),
					buildIdentifier('query'),
					[buildArg(buildVariable('query_args'))]
				)
			),
			indentLevel
		)
	);

	const errorGuard = buildIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(buildVariable('results')),
		]),
		statements: [
			createReturnPrintable(buildVariable('results'), indentLevel + 1),
		],
	});
	options.body.statement(errorGuard);
	options.body.blank();

	options.body.statement(
		formatStatementPrintable(buildListItemsInitialiserStatement(), {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);

	const foreachPrintable = createResultsForeach({
		pascalName: options.pascalName,
		indentLevel,
	});
	options.body.statement(foreachPrintable);
	options.body.blank();

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildVariable('count_query_args'),
				buildVariable('query_args')
			),
			indentLevel
		)
	);

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('count')
				),
				buildScalarBool(true)
			),
			indentLevel
		)
	);

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('number')
				),
				buildScalarInt(0)
			),
			indentLevel
		)
	);

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('offset')
				),
				buildScalarInt(0)
			),
			indentLevel
		)
	);
	options.body.blank();

	options.body.statement(
		buildWpTermQueryInstantiation({
			target: 'count_query',
			indentLevel,
		})
	);

	options.body.statement(
		createExpressionPrintable(
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
			),
			indentLevel
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
	options.body.statement(
		createExpressionPrintable(
			buildAssign(buildVariable('pages'), pagesExpression),
			indentLevel
		)
	);
	options.body.blank();

	options.body.statement(
		createReturnPrintable(
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
			]),
			indentLevel
		)
	);

	return true;
}

function appendExtraArgsMerge(options: {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
}): void {
	const indentLevel = options.indentLevel;

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildVariable('extra_args'),
				buildMethodCall(
					buildVariable('request'),
					buildIdentifier('get_params'),
					[]
				)
			),
			indentLevel
		)
	);

	const skipArray = buildArray([
		buildArrayItem(buildScalarString('page')),
		buildArrayItem(buildScalarString('per_page')),
		buildArrayItem(buildScalarString('taxonomy')),
		buildArrayItem(buildScalarString('hide_empty')),
	]);

	const continuePrintable = createContinuePrintable(indentLevel + 2);

	const guard = buildIfPrintable({
		indentLevel: indentLevel + 1,
		condition: buildFuncCall(buildName(['in_array']), [
			buildArg(buildVariable('key')),
			buildArg(skipArray),
			buildArg(buildScalarBool(true)),
		]),
		statements: [continuePrintable],
	});

	const assignPrintable = createExpressionPrintable(
		buildAssign(
			buildArrayDimFetch('query_args', buildVariable('key')),
			buildVariable('value')
		),
		indentLevel + 2
	);

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildVariable('extra_args'),
		valueVar: buildVariable('value'),
		keyVar: buildVariable('key'),
		byRef: false,
		stmts: [guard.node, assignPrintable.node],
	});

	options.body.statement(
		formatStatementPrintable(foreachNode, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
	options.body.blank();
}

function createResultsForeach(options: {
	readonly pascalName: string;
	readonly indentLevel: number;
}): PhpPrintable<PhpStmtForeach> {
	const appendStatement = createExpressionPrintable(
		buildAssign(
			buildArrayDimFetch('items', null),
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term')
		),
		options.indentLevel + 2
	);

	const guard = buildIfPrintable({
		indentLevel: options.indentLevel + 1,
		condition: buildInstanceof('term', 'WP_Term'),
		statements: [appendStatement],
	});

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildVariable('results'),
		valueVar: buildVariable('term'),
		keyVar: null,
		byRef: false,
		stmts: [guard.node],
	});

	return formatStatementPrintable(foreachNode, {
		indentLevel: options.indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createExpressionPrintable(
	expression: PhpExpr,
	indentLevel: number
): PhpPrintable<PhpStmtExpression> {
	const statement = buildExpressionStatement(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createReturnPrintable(
	expression: PhpExpr | null,
	indentLevel: number
): PhpPrintable<PhpStmtReturn> {
	const statement = buildReturn(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createContinuePrintable(
	indentLevel: number
): PhpPrintable<PhpStmtContinue> {
	const continueNode = buildNode<PhpStmtContinue>('Stmt_Continue', {
		num: null,
	});
	return formatStatementPrintable(continueNode, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
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
