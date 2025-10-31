import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarString,
	buildVariable,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import { appendResourceCacheEvent, type ResourceMetadataHost } from '../cache';
import { buildWpErrorReturn } from '../errors';
import {
	appendStatementsWithSpacing,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	buildPropertyFetch,
	buildScalarCast,
} from '../common/utils';
import {
	buildPaginationNormalisationStatements,
	buildPageExpression,
	buildQueryArgsAssignmentStatement,
	buildWpQueryExecutionStatement,
} from '../query';
import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	buildMetaQueryStatements,
	buildTaxonomyQueryStatements,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
} from './query';
import type { MutationHelperResource, MutationMetadataKeys } from './mutation';
import {
	buildCreateRouteStatements,
	buildDeleteRouteStatements,
	buildUpdateRouteStatements,
} from './routes/mutation';
import { variable } from '../common/phpValue';
import {
	buildIdentityGuardStatements,
	isNumericIdentity,
	type ResolvedIdentity,
	type IdentityGuardOptions,
} from '../../pipeline/identity';
import { type RestControllerRouteHandlers } from '../../rest-controller/routes/buildResourceControllerRouteSet';

interface BuildListRouteContext {
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

interface BuildGetRouteContext {
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export interface BuildWpPostStorageArtifactsOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly metadataKeys: MutationMetadataKeys;
	readonly errorCodeFactory: (suffix: string) => string;
}

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

export interface WpPostStorageArtifacts {
	readonly helperMethods?: readonly PhpStmtClassMethod[];
	readonly routeHandlers: RestControllerRouteHandlers;
}

export function buildWpPostStorageArtifacts(
	options: BuildWpPostStorageArtifactsOptions
): WpPostStorageArtifacts {
	const storage = ensureWpPostStorage(options.resource.storage);

	if (!storage) {
		return { routeHandlers: {} };
	}

	return {
		routeHandlers: {
			list: (context) =>
				buildWpPostListRouteStatements(options, storage, {
					metadataHost: context.metadataHost,
					cacheSegments: context.metadata.cacheSegments ?? [],
				}),
			get: (context) =>
				buildWpPostGetRouteStatements(options, storage, {
					metadataHost: context.metadataHost,
					cacheSegments: context.metadata.cacheSegments ?? [],
				}),
			create: () =>
				buildCreateRouteStatements({
					resource: options.resource,
					pascalName: options.pascalName,
					metadataKeys: options.metadataKeys,
				}) ?? null,
			update: () =>
				buildUpdateRouteStatements({
					resource: options.resource,
					pascalName: options.pascalName,
					metadataKeys: options.metadataKeys,
					identity: options.identity,
				}) ?? null,
			remove: () =>
				buildDeleteRouteStatements({
					resource: options.resource,
					pascalName: options.pascalName,
					metadataKeys: options.metadataKeys,
					identity: options.identity,
				}) ?? null,
		},
	} satisfies WpPostStorageArtifacts;
}

function buildWpPostListRouteStatements(
	options: BuildWpPostStorageArtifactsOptions,
	storage: WpPostStorage,
	context: BuildListRouteContext
): PhpStmt[] | null {
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
				host: context.metadataHost,
				scope: 'list',
				operation: 'read',
				segments: context.cacheSegments,
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

function buildWpPostGetRouteStatements(
	options: BuildWpPostStorageArtifactsOptions,
	_storage: WpPostStorage,
	context: BuildGetRouteContext
): PhpStmt[] | null {
	appendResourceCacheEvent({
		host: context.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: context.cacheSegments,
		description: 'Get request',
	});

	const statements: PhpStmt[] = [];

	const identityOptions: IdentityGuardOptions = isNumericIdentity(
		options.identity
	)
		? {
				identity: options.identity,
				pascalName: options.pascalName,
				errorCodeFactory: options.errorCodeFactory,
			}
		: {
				identity: options.identity,
				pascalName: options.pascalName,
				errorCodeFactory: options.errorCodeFactory,
			};

	appendStatementsWithSpacing(
		statements,
		buildIdentityGuardStatements(identityOptions)
	);

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post',
			subject: 'this',
			method: `resolve${options.pascalName}Post`,
			args: [buildArg(buildVariable(options.identity.param))],
		})
	);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	appendStatementsWithSpacing(statements, [
		buildIfStatementNode({
			condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
			statements: [notFoundReturn],
		}),
	]);

	statements.push(
		buildReturn(
			buildMethodCallExpression({
				subject: 'this',
				method: `prepare${options.pascalName}Response`,
				args: [
					buildArg(buildVariable('post')),
					buildArg(buildVariable('request')),
				],
			})
		)
	);

	return statements;
}

function ensureWpPostStorage(
	storage: MutationHelperResource['storage']
): WpPostStorage | undefined {
	if (!storage || storage.mode !== 'wp-post') {
		return undefined;
	}

	return storage as WpPostStorage;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
