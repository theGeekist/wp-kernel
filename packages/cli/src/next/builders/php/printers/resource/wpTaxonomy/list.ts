import { KernelError } from '@wpkernel/core/contracts';
import {
	createArg,
	createArray,
	createArrayItem,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNode,
	createReturn,
	createScalarBool,
	createScalarInt,
	createScalarString,
	createVariable,
	type PhpStmt,
	type PhpStmtContinue,
	type PhpStmtForeach,
} from '@wpkernel/php-json-ast/nodes';
import { createPrintable, type PhpPrintable } from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast/templates';
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
import { createWpTermQueryInstantiation } from '@wpkernel/php-json-ast/factories/wpTermQuery';
import type { ResourceMetadataHost } from '@wpkernel/php-json-ast/factories/cacheMetadata';
import type { IRResource } from '../../../../../../ir/types';

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
		createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable('taxonomy'),
					createMethodCall(
						createVariable('this'),
						createIdentifier(`get${options.pascalName}Taxonomy`),
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
			createVariable('page'),
			createScalarInt(0)
		),
		conditionText: `${indent}if ( $page <= 0 ) {`,
		statements: [
			createPrintable(
				createExpressionStatement(
					createAssign(createVariable('page'), createScalarInt(1))
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

	const numberAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch('query_args', createScalarString('number')),
				createVariable('per_page')
			)
		),
		[`${indent}$query_args['number'] = $per_page;`]
	);
	const offsetAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch('query_args', createScalarString('offset')),
				buildBinaryOperation(
					'Mul',
					buildBinaryOperation(
						'Minus',
						createVariable('page'),
						createScalarInt(1)
					),
					createVariable('per_page')
				)
			)
		),
		[`${indent}$query_args['offset'] = ( $page - 1 ) * $per_page;`]
	);
	options.body.statement(numberAssign);
	options.body.statement(offsetAssign);
	options.body.blank();

	options.body.statement(
		createWpTermQueryInstantiation({
			target: 'term_query',
			indentLevel,
		})
	);

	options.body.statement(
		createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable('results'),
					createMethodCall(
						createVariable('term_query'),
						createIdentifier('query'),
						[createArg(createVariable('query_args'))]
					)
				)
			),
			[`${indent}$results = $term_query->query( $query_args );`]
		)
	);

	const errorGuard = buildIfPrintable({
		indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('results')),
		]),
		conditionText: `${indent}if ( is_wp_error( $results ) ) {`,
		statements: [
			createPrintable(createReturn(createVariable('results')), [
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

	const countQueryArgsAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('count_query_args'),
				createVariable('query_args')
			)
		),
		[`${indent}$count_query_args = $query_args;`]
	);
	options.body.statement(countQueryArgsAssign);

	const countFlagAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch(
					'count_query_args',
					createScalarString('count')
				),
				createScalarBool(true)
			)
		),
		[`${indent}$count_query_args['count'] = true;`]
	);
	options.body.statement(countFlagAssign);

	const countNumberAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch(
					'count_query_args',
					createScalarString('number')
				),
				createScalarInt(0)
			)
		),
		[`${indent}$count_query_args['number'] = 0;`]
	);
	options.body.statement(countNumberAssign);

	const countOffsetAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch(
					'count_query_args',
					createScalarString('offset')
				),
				createScalarInt(0)
			)
		),
		[`${indent}$count_query_args['offset'] = 0;`]
	);
	options.body.statement(countOffsetAssign);
	options.body.blank();

	options.body.statement(
		createWpTermQueryInstantiation({
			target: 'count_query',
			indentLevel,
		})
	);

	const totalAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('total'),
				buildScalarCast(
					'int',
					createMethodCall(
						createVariable('count_query'),
						createIdentifier('query'),
						[createArg(createVariable('count_query_args'))]
					)
				)
			)
		),
		[`${indent}$total = (int) $count_query->query( $count_query_args );`]
	);
	options.body.statement(totalAssign);

	const pagesExpression = buildScalarCast(
		'int',
		createFuncCall(createName(['ceil']), [
			createArg(
				buildBinaryOperation(
					'Div',
					createVariable('total'),
					createFuncCall(createName(['max']), [
						createArg(createScalarInt(1)),
						createArg(createVariable('per_page')),
					])
				)
			),
		])
	);
	const pagesAssign = createPrintable(
		createExpressionStatement(
			createAssign(createVariable('pages'), pagesExpression)
		),
		[`${indent}$pages = (int) ceil( $total / max( 1, $per_page ) );`]
	);
	options.body.statement(pagesAssign);
	options.body.blank();

	const returnPrintable = createPrintable(
		createReturn(
			createArray([
				createArrayItem(createVariable('items'), {
					key: createScalarString('items'),
				}),
				createArrayItem(createVariable('total'), {
					key: createScalarString('total'),
				}),
				createArrayItem(createVariable('pages'), {
					key: createScalarString('pages'),
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
		createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable('extra_args'),
					createMethodCall(
						createVariable('request'),
						createIdentifier('get_params'),
						[]
					)
				)
			),
			[`${indent}$extra_args = $request->get_params();`]
		)
	);

	const skipArray = createArray([
		createArrayItem(createScalarString('page')),
		createArrayItem(createScalarString('per_page')),
		createArrayItem(createScalarString('taxonomy')),
		createArrayItem(createScalarString('hide_empty')),
	]);

	const continuePrintable = createPrintable(
		createNode<PhpStmtContinue>('Stmt_Continue', { num: null }),
		[`${childIndent}${PHP_INDENT}continue;`]
	);

	const guard = buildIfPrintable({
		indentLevel: indentLevel + 1,
		condition: createFuncCall(createName(['in_array']), [
			createArg(createVariable('key')),
			createArg(skipArray),
			createArg(createScalarBool(true)),
		]),
		conditionText: `${childIndent}if ( in_array( $key, array( 'page', 'per_page', 'taxonomy', 'hide_empty' ), true ) ) {`,
		statements: [continuePrintable],
	});

	const assign = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch('query_args', createVariable('key')),
				createVariable('value')
			)
		),
		[`${childIndent}$query_args[ $key ] = $value;`]
	);

	const foreachNode = createNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: createVariable('extra_args'),
		valueVar: createVariable('value'),
		keyVar: createVariable('key'),
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

	options.body.statement(createPrintable(foreachNode, foreachLines));
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
			createPrintable(
				createExpressionStatement(
					createAssign(
						buildArrayDimFetch('items', null),
						createMethodCall(
							createVariable('this'),
							createIdentifier(
								`prepare${options.pascalName}TermResponse`
							),
							[createArg(createVariable('term'))]
						)
					)
				),
				[
					`${childIndent}${PHP_INDENT}$items[] = $this->prepare${options.pascalName}TermResponse( $term );`,
				]
			),
		],
	});

	const foreachNode = createNode<PhpStmtForeach>('Stmt_Foreach', {
		expr: createVariable('results'),
		valueVar: createVariable('term'),
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

	return createPrintable(foreachNode, lines);
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
