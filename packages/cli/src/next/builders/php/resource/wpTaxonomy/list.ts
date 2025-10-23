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
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
	buildPrintable,
	type PhpPrintable,
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import {
	createPaginationNormalisation,
	createQueryArgsAssignment,
} from '../query';
import { variable } from '../phpValue';
import { createRequestParamAssignment } from '../request';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildIfPrintable,
	buildInstanceof,
	buildScalarCast,
} from '../utils';
import { createListItemsInitialiser } from '../wpPost/list';
import { buildWpTermQueryInstantiation } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';

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
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	options.body.statement(
		buildPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable('taxonomy'),
					buildMethodCall(
						buildVariable('this'),
						buildIdentifier(`get${options.pascalName}Taxonomy`),
						[]
					)
				)
			),
			[`${indent}$taxonomy = $this->get${options.pascalName}Taxonomy();`]
		)
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
		conditionText: `${indent}if ( $page <= 0 ) {`,
		statements: [
			buildPrintable(
				buildExpressionStatement(
					buildAssign(buildVariable('page'), buildScalarInt(1))
				),
				[`${childIndent}$page = 1;`]
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

	const numberAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildScalarString('number')),
				buildVariable('per_page')
			)
		),
		[`${indent}$query_args['number'] = $per_page;`]
	);
	const offsetAssign = buildPrintable(
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
		[`${indent}$query_args['offset'] = ( $page - 1 ) * $per_page;`]
	);
	options.body.statement(numberAssign);
	options.body.statement(offsetAssign);
	options.body.blank();

	options.body.statement(
		buildWpTermQueryInstantiation({
			target: 'term_query',
			indentLevel,
		})
	);

	options.body.statement(
		buildPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable('results'),
					buildMethodCall(
						buildVariable('term_query'),
						buildIdentifier('query'),
						[buildArg(buildVariable('query_args'))]
					)
				)
			),
			[`${indent}$results = $term_query->query( $query_args );`]
		)
	);

	const errorGuard = buildIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(buildVariable('results')),
		]),
		conditionText: `${indent}if ( is_wp_error( $results ) ) {`,
		statements: [
			buildPrintable(buildReturn(buildVariable('results')), [
				`${childIndent}return $results;`,
			]),
		],
	});
	options.body.statement(errorGuard);
	options.body.blank();

	options.body.statement(createListItemsInitialiser({ indentLevel }));

	const foreachPrintable = createResultsForeach({
		pascalName: options.pascalName,
		indentLevel,
	});
	options.body.statement(foreachPrintable);
	options.body.blank();

	const countQueryArgsAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('count_query_args'),
				buildVariable('query_args')
			)
		),
		[`${indent}$count_query_args = $query_args;`]
	);
	options.body.statement(countQueryArgsAssign);

	const countFlagAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('count')
				),
				buildScalarBool(true)
			)
		),
		[`${indent}$count_query_args['count'] = true;`]
	);
	options.body.statement(countFlagAssign);

	const countNumberAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('number')
				),
				buildScalarInt(0)
			)
		),
		[`${indent}$count_query_args['number'] = 0;`]
	);
	options.body.statement(countNumberAssign);

	const countOffsetAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'count_query_args',
					buildScalarString('offset')
				),
				buildScalarInt(0)
			)
		),
		[`${indent}$count_query_args['offset'] = 0;`]
	);
	options.body.statement(countOffsetAssign);
	options.body.blank();

	options.body.statement(
		buildWpTermQueryInstantiation({
			target: 'count_query',
			indentLevel,
		})
	);

	const totalAssign = buildPrintable(
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
		),
		[`${indent}$total = (int) $count_query->query( $count_query_args );`]
	);
	options.body.statement(totalAssign);

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
	const pagesAssign = buildPrintable(
		buildExpressionStatement(
			buildAssign(buildVariable('pages'), pagesExpression)
		),
		[`${indent}$pages = (int) ceil( $total / max( 1, $per_page ) );`]
	);
	options.body.statement(pagesAssign);
	options.body.blank();

	const returnPrintable = buildPrintable(
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
		),
		[
			`${indent}return array(`,
			`${indent}${PHP_INDENT}'items' => $items,`,
			`${indent}${PHP_INDENT}'total' => $total,`,
			`${indent}${PHP_INDENT}'pages' => $pages,`,
			`${indent});`,
		]
	);
	options.body.statement(returnPrintable);

	return true;
}

function appendExtraArgsMerge(options: {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
}): void {
	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	options.body.statement(
		buildPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable('extra_args'),
					buildMethodCall(
						buildVariable('request'),
						buildIdentifier('get_params'),
						[]
					)
				)
			),
			[`${indent}$extra_args = $request->get_params();`]
		)
	);

	const skipArray = buildArray([
		buildArrayItem(buildScalarString('page')),
		buildArrayItem(buildScalarString('per_page')),
		buildArrayItem(buildScalarString('taxonomy')),
		buildArrayItem(buildScalarString('hide_empty')),
	]);

	const continuePrintable = buildPrintable(
		buildNode<PhpStmtContinue>('Stmt_Continue', { num: null }),
		[`${childIndent}${PHP_INDENT}continue;`]
	);

	const guard = buildIfPrintable({
		indentLevel: indentLevel + 1,
		condition: buildFuncCall(buildName(['in_array']), [
			buildArg(buildVariable('key')),
			buildArg(skipArray),
			buildArg(buildScalarBool(true)),
		]),
		conditionText: `${childIndent}if ( in_array( $key, array( 'page', 'per_page', 'taxonomy', 'hide_empty' ), true ) ) {`,
		statements: [continuePrintable],
	});

	const assign = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch('query_args', buildVariable('key')),
				buildVariable('value')
			)
		),
		[`${childIndent}$query_args[ $key ] = $value;`]
	);

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildVariable('extra_args'),
		valueVar: buildVariable('value'),
		keyVar: buildVariable('key'),
		byRef: false,
		stmts: [guard.node, assign.node],
	});

	const foreachLines = [
		`${indent}foreach ( $extra_args as $key => $value ) {`,
		`${childIndent}if ( in_array( $key, array( 'page', 'per_page', 'taxonomy', 'hide_empty' ), true ) ) {`,
		`${childIndent}${PHP_INDENT}continue;`,
		`${childIndent}}`,
		`${childIndent}$query_args[ $key ] = $value;`,
		`${indent}}`,
	];

	options.body.statement(buildPrintable(foreachNode, foreachLines));
	options.body.blank();
}

function createResultsForeach(options: {
	readonly pascalName: string;
	readonly indentLevel: number;
}): PhpPrintable<PhpStmt> {
	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	const guard = buildIfPrintable({
		indentLevel: indentLevel + 1,
		condition: buildInstanceof('term', 'WP_Term'),
		conditionText: `${childIndent}if ( $term instanceof WP_Term ) {`,
		statements: [
			buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch('items', null),
						buildMethodCall(
							buildVariable('this'),
							buildIdentifier(
								`prepare${options.pascalName}TermResponse`
							),
							[buildArg(buildVariable('term'))]
						)
					)
				),
				[
					`${childIndent}${PHP_INDENT}$items[] = $this->prepare${options.pascalName}TermResponse( $term );`,
				]
			),
		],
	});

	const foreachNode = buildNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: buildVariable('results'),
		valueVar: buildVariable('term'),
		keyVar: null,
		byRef: false,
		stmts: [guard.node],
	});

	const lines = [
		`${indent}foreach ( $results as $term ) {`,
		`${childIndent}if ( $term instanceof WP_Term ) {`,
		`${childIndent}${PHP_INDENT}$items[] = $this->prepare${options.pascalName}TermResponse( $term );`,
		`${childIndent}}`,
		`${indent}}`,
	];

	return buildPrintable(foreachNode, lines);
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
