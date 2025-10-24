import {
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildMethodCall,
	buildReturn,
	buildScalarString,
	buildVariable,
	buildIdentifier,
	buildPrintable,
	isNonEmptyString,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildMetaQueryStatements,
	buildTaxonomyQueryStatements,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	createPageExpression,
	createPaginationNormalisationStatements,
	buildPropertyFetch,
	createQueryArgsAssignmentStatement,
	buildScalarCast,
	createWpQueryExecutionStatement,
	variable,
	buildWpTaxonomyListRouteBody,
} from '../../resource';
import { formatStatementPrintable } from '../../resource/printer';
import type { IRResource } from '../../../../../ir/types';

export interface BuildListRouteBodyOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildListRouteBody(
	options: BuildListRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage) {
		return false;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyListRouteBody({
			body: options.body,
			indentLevel: options.indentLevel,
			resource: options.resource,
			pascalName: options.pascalName,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
		return false;
	}

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);

	const postTypePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_type'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		),
		[`${indent}$post_type = $this->get${options.pascalName}PostType();`]
	);
	options.body.statement(postTypePrintable);

	const [perPageAssign, ensurePositive, clampMaximum] =
		createPaginationNormalisationStatements({
			requestVariable: '$request',
			targetVariable: 'per_page',
		});
	options.body.statement(
		formatStatementPrintable(perPageAssign, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
	options.body.statement(
		formatStatementPrintable(ensurePositive, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
	options.body.statement(
		formatStatementPrintable(clampMaximum, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
	options.body.blank();

	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];

	if (statuses.length > 0) {
		const statusesPrintable = buildPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable('statuses'),
					buildMethodCall(
						buildVariable('this'),
						buildIdentifier(`get${options.pascalName}Statuses`),
						[]
					)
				)
			),
			[`${indent}$statuses = $this->get${options.pascalName}Statuses();`]
		);
		options.body.statement(statusesPrintable);
		options.body.blank();
	}

	const metaEntries = collectMetaQueryEntries(storage);
	const taxonomyEntries = collectTaxonomyQueryEntries(storage);

	const queryEntries = [
		{ key: 'post_type', value: variable('post_type') },
		{
			key: 'post_status',
			value: statuses.length > 0 ? variable('statuses') : 'any',
		},
		{ key: 'fields', value: 'ids' },
		{
			key: 'paged',
			value: createPageExpression({ requestVariable: '$request' }),
		},
		{ key: 'posts_per_page', value: variable('per_page') },
	] as const;

	const queryArgsAssignment = createQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: queryEntries,
	});
	options.body.statement(
		formatStatementPrintable(queryArgsAssignment, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
	options.body.blank();

	const metaQueryStatements = buildMetaQueryStatements({
		entries: metaEntries,
	});
	appendPrintableStatements(options.body, metaQueryStatements, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});

	const taxonomyStatements = buildTaxonomyQueryStatements({
		entries: taxonomyEntries,
	});
	appendPrintableStatements(options.body, taxonomyStatements, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});

	const wpQueryExecution = createWpQueryExecutionStatement({
		target: 'query',
		argsVariable: 'query_args',
		cache: {
			host: options.metadataHost,
			scope: 'list',
			operation: 'read',
			segments: options.cacheSegments,
			description: 'List query',
		},
	});
	options.body.statement(
		formatStatementPrintable(wpQueryExecution, {
			indentLevel,
			indentUnit: PHP_INDENT,
		})
	);

	const itemsPrintable = formatStatementPrintable(
		buildListItemsInitialiserStatement(),
		{ indentLevel, indentUnit: PHP_INDENT }
	);
	options.body.statement(itemsPrintable);
	options.body.blank();

	const foreachPrintable = formatStatementPrintable(
		buildListForeachStatement({
			pascalName: options.pascalName,
		}),
		{ indentLevel, indentUnit: PHP_INDENT }
	);
	options.body.statement(foreachPrintable);
	options.body.blank();

	const totalFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'found_posts')
	);
	const pagesFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'max_num_pages')
	);

	const returnPrintable = buildPrintable(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable('items'), {
					key: buildScalarString('items'),
				}),
				buildArrayItem(totalFetch, {
					key: buildScalarString('total'),
				}),
				buildArrayItem(pagesFetch, {
					key: buildScalarString('pages'),
				}),
			])
		),
		[
			`${indent}return array(`,
			`${indent}${PHP_INDENT}'items' => $items,`,
			`${indent}${PHP_INDENT}'total' => (int) $query->found_posts,`,
			`${indent}${PHP_INDENT}'pages' => (int) $query->max_num_pages,`,
			`${indent});`,
		]
	);
	options.body.statement(returnPrintable);

	return true;
}

interface AppendPrintableOptions {
	readonly indentLevel: number;
	readonly indentUnit: string;
}

function appendPrintableStatements(
	body: PhpMethodBodyBuilder,
	statements: readonly PhpStmt[],
	options: AppendPrintableOptions
): void {
	if (statements.length === 0) {
		return;
	}

	for (const statement of statements) {
		body.statement(
			formatStatementPrintable(statement, {
				indentLevel: options.indentLevel,
				indentUnit: options.indentUnit,
			})
		);
	}

	body.blank();
}
