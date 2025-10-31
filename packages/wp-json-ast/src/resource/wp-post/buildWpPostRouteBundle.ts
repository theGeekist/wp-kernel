import { WPKernelError } from '@wpkernel/core';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildReturn,
	buildScalarString,
	buildScalarCast,
	buildVariable,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	appendStatementsWithSpacing,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	buildPropertyFetch,
} from '../common/utils';
import { variable } from '../common/phpValue';
import {
	buildPaginationNormalisationStatements,
	buildPageExpression,
	buildQueryArgsAssignmentStatement,
	buildWpQueryExecutionStatement,
} from '../query';
import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
} from './query/list';
import {
	buildMetaQueryStatements,
	collectMetaQueryEntries,
} from './query/metaQuery';
import {
	buildTaxonomyQueryStatements,
	collectTaxonomyQueryEntries,
} from './query/taxonomyQuery';
import {
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
	WP_POST_MUTATION_CONTRACT,
	type MutationHelperOptions,
	type MutationHelperResource,
	type MutationMetadataKeys,
} from './mutation';
import {
	buildCreateRouteStatements,
	buildDeleteRouteStatements,
	buildUpdateRouteStatements,
} from './routes/mutation';
import { buildWpErrorReturn } from '../errors';
import { appendResourceCacheEvent } from '../cache';
import {
	buildIdentityGuardStatements,
	isNumericIdentity,
	type IdentityGuardOptions,
	type ResolvedIdentity,
} from '../../pipeline/identity';
import {
	type RestControllerRouteHandlers,
	type RestControllerRouteStatementsBuilder,
} from '../../rest-controller/routes/buildResourceControllerRouteSet';
import type { ResourceMutationContract } from './mutation/contract';

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

interface WpPostResource extends MutationHelperResource {
	readonly storage?: ResourceStorageConfig | null;
}

export interface BuildWpPostRouteBundleOptions {
	readonly resource: WpPostResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export interface WpPostRouteBundle {
	readonly storageKind: 'wp-post';
	readonly handlers: RestControllerRouteHandlers;
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly metadata: {
		readonly mutationContract: ResourceMutationContract;
	};
}

export function buildWpPostRouteBundle(
	options: BuildWpPostRouteBundleOptions
): WpPostRouteBundle {
	const storage = ensureWpPostStorage(options.resource.storage);
	const mutationMetadata = WP_POST_MUTATION_CONTRACT.metadataKeys;

	return {
		storageKind: 'wp-post',
		handlers: buildRouteHandlers({ ...options, storage, mutationMetadata }),
		helperMethods: buildHelperMethods({ ...options, storage }),
		metadata: {
			mutationContract: WP_POST_MUTATION_CONTRACT,
		},
	} satisfies WpPostRouteBundle;
}

interface BuildRouteHandlersOptions extends BuildWpPostRouteBundleOptions {
	readonly storage: WpPostStorage;
	readonly mutationMetadata: MutationMetadataKeys;
}

function buildRouteHandlers(
	options: BuildRouteHandlersOptions
): RestControllerRouteHandlers {
	return {
		list: createListHandler(options),
		get: createGetHandler(options),
		create: () =>
			buildCreateRouteStatements({
				resource: buildMutationResource(options),
				pascalName: options.pascalName,
				metadataKeys: options.mutationMetadata,
			}),
		update: () =>
			buildUpdateRouteStatements({
				resource: buildMutationResource(options),
				pascalName: options.pascalName,
				metadataKeys: options.mutationMetadata,
				identity: options.identity,
			}),
		remove: () =>
			buildDeleteRouteStatements({
				resource: buildMutationResource(options),
				pascalName: options.pascalName,
				metadataKeys: options.mutationMetadata,
				identity: options.identity,
			}),
	} satisfies RestControllerRouteHandlers;
}

function buildHelperMethods(
	options: BuildWpPostRouteBundleOptions & { readonly storage: WpPostStorage }
): readonly PhpStmtClassMethod[] {
	const helperOptions: MutationHelperOptions = {
		resource: {
			name: options.resource.name,
			storage: options.storage,
		},
		pascalName: options.pascalName,
		identity: options.identity,
	};

	return [
		syncWpPostMeta(helperOptions),
		syncWpPostTaxonomies(helperOptions),
		prepareWpPostResponse(helperOptions),
	];
}

function createListHandler(
	options: BuildRouteHandlersOptions
): RestControllerRouteStatementsBuilder {
	const statuses = collectStatuses(options.storage);
	const metaEntries = collectMetaQueryEntries(options.storage);
	const taxonomyEntries = collectTaxonomyQueryEntries(options.storage);

	return (context) => {
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

		if (statuses.length > 0) {
			appendStatementsWithSpacing(statements, [
				buildMethodCallAssignmentStatement({
					variable: 'statuses',
					subject: 'this',
					method: `get${options.pascalName}Statuses`,
				}),
			]);
		}

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

		const queryAssignment = buildQueryArgsAssignmentStatement({
			targetVariable: 'query_args',
			entries: queryEntries,
		});
		appendStatementsWithSpacing(statements, [queryAssignment]);

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
					segments: context.metadata.cacheSegments ?? [],
					description: 'List query',
				},
			}),
		]);

		appendStatementsWithSpacing(statements, [
			buildListItemsInitialiserStatement(),
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
	};
}

function createGetHandler(
	options: BuildRouteHandlersOptions
): RestControllerRouteStatementsBuilder {
	return (context) => {
		const statements: PhpStmt[] = [];
		appendResourceCacheEvent({
			host: context.metadataHost,
			scope: 'get',
			operation: 'read',
			segments: context.metadata.cacheSegments ?? [],
			description: 'Get request',
		});

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
		const identityStatements =
			buildIdentityGuardStatements(identityOptions);
		appendStatementsWithSpacing(statements, identityStatements);

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
	};
}

function ensureWpPostStorage(
	storage: ResourceStorageConfig | null | undefined
): WpPostStorage {
	if (!storage || storage.mode !== 'wp-post') {
		throw new WPKernelError('DeveloperError', {
			message: 'Expected wp-post storage configuration.',
			context: { storageMode: storage?.mode },
		});
	}

	return storage;
}

function collectStatuses(storage: WpPostStorage): readonly string[] {
	return Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function buildMutationResource(
	options: BuildRouteHandlersOptions
): MutationHelperResource {
	return {
		name: options.resource.name,
		storage: options.storage,
	};
}
