import {
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarCast,
	buildScalarString,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceMetadataHost } from '@wpkernel/wp-json-ast';
import { isNonEmptyString } from '../../utils';
import {
	buildMetaQueryStatements,
	buildTaxonomyQueryStatements,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	buildPageExpression,
	buildPaginationNormalisationStatements,
	buildPropertyFetch,
	buildQueryArgsAssignmentStatement,
	buildWpQueryExecutionStatement,
	buildMethodCallAssignmentStatement,
	appendStatementsWithSpacing,
	variable,
	buildWpTaxonomyListRouteStatements,
} from '../../resource';
import type { IRResource } from '../../../../ir/publicTypes';

export interface BuildListRouteStatementsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildListRouteStatements(
	options: BuildListRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage) {
		return null;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyListRouteStatements({
			resource: options.resource,
			pascalName: options.pascalName,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
		return null;
	}

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post_type',
			subject: 'this',
			method: `get${options.pascalName}PostType`,
		})
	);

	const [perPageAssign, ensurePositive, clampMaximum] =
		buildPaginationNormalisationStatements({
			requestVariable: '$request',
			targetVariable: 'per_page',
		});

	appendStatementsWithSpacing(statements, [
		perPageAssign,
		ensurePositive,
		clampMaximum,
	]);

	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];

	if (statuses.length > 0) {
		appendStatementsWithSpacing(statements, [
			buildMethodCallAssignmentStatement({
				variable: 'statuses',
				subject: 'this',
				method: `get${options.pascalName}Statuses`,
			}),
		]);
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
			value: buildPageExpression({ requestVariable: '$request' }),
		},
		{ key: 'posts_per_page', value: variable('per_page') },
	];

	const queryArgsAssignment = buildQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: queryEntries,
	});
	appendStatementsWithSpacing(statements, [queryArgsAssignment]);

	appendStatementsWithSpacing(
		statements,
		buildMetaQueryStatements({ entries: metaEntries })
	);
	appendStatementsWithSpacing(
		statements,
		buildTaxonomyQueryStatements({ entries: taxonomyEntries })
	);

	appendStatementsWithSpacing(statements, [
		buildWpQueryExecutionStatement({
			target: 'query',
			argsVariable: 'query_args',
			cache: {
				host: options.metadataHost,
				scope: 'list',
				operation: 'read',
				segments: options.cacheSegments,
				description: 'List query',
			},
		}),
	]);

	appendStatementsWithSpacing(statements, [
		buildListItemsInitialiserStatement(),
	]);

	appendStatementsWithSpacing(statements, [
		buildListForeachStatement({ pascalName: options.pascalName }),
	]);

	const totalFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'found_posts')
	);
	const pagesFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'max_num_pages')
	);

	statements.push(
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
		)
	);

	return statements;
}
