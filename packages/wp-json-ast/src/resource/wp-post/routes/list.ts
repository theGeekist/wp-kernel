import {
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarCast,
	buildScalarString,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import type { ResourceMetadataHost } from '../../cache';
import {
	appendStatementsWithSpacing,
	buildMethodCallAssignmentStatement,
	buildPropertyFetch,
} from '../../common/utils';
import {
	buildPageExpression,
	buildPaginationNormalisationStatements,
	buildQueryArgsAssignmentStatement,
	buildWpQueryExecutionStatement,
} from '../../query';
import { variable } from '../../common/phpValue';
import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
	buildMetaQueryStatements,
	buildTaxonomyQueryStatements,
} from '../query';
import type { MutationHelperResource } from '../mutation';

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

export interface BuildWpPostListRouteStatementsOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildWpPostListRouteStatements(
	options: BuildWpPostListRouteStatementsOptions
): PhpStmt[] | null {
	const storage = ensureWpPostStorage(options.resource.storage);
	if (!storage) {
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

	const statuses = filterStatuses(storage);

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

	appendStatementsWithSpacing(statements, [
		buildQueryArgsAssignmentStatement({
			targetVariable: 'query_args',
			entries: queryEntries,
		}),
	]);

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

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable('items'), {
					key: buildScalarString('items'),
				}),
				buildArrayItem(
					buildScalarCast(
						'int',
						buildPropertyFetch('query', 'found_posts')
					),
					{ key: buildScalarString('total') }
				),
				buildArrayItem(
					buildScalarCast(
						'int',
						buildPropertyFetch('query', 'max_num_pages')
					),
					{ key: buildScalarString('pages') }
				),
			])
		)
	);

	return statements;
}

function ensureWpPostStorage(
	storage: MutationHelperResource['storage']
): WpPostStorage | null {
	if (!storage || storage.mode !== 'wp-post') {
		return null;
	}

	return storage;
}

function filterStatuses(storage: WpPostStorage): string[] {
	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];

	return statuses;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
