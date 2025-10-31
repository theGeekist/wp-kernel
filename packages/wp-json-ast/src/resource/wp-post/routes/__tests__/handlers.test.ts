import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import type { ResourceMetadataHost } from '../../../cache';
import type { ResourceControllerRouteMetadata } from '../../../../types';
import { buildWpPostRouteHandlers } from '../handlers';
import type { BuildWpPostRouteHandlersOptions } from '../handlers';
import type { MutationMetadataKeys } from '../../mutation';
import type { ResolvedIdentity } from '../../../../pipeline/identity';
import type { RestControllerRouteStatementsContext } from '@wpkernel/wp-json-ast';

const METADATA_KEYS: MutationMetadataKeys = {
	cacheSegment: 'cache:wp-post',
	channelTag: 'resource.wpPost.mutation',
	statusValidation: 'mutation:status',
	syncMeta: 'mutation:meta',
	syncTaxonomies: 'mutation:taxonomies',
	cachePriming: 'mutation:cache',
};

const IDENTITY: ResolvedIdentity = { type: 'number', param: 'id' };

function buildResource(
	overrides: Partial<Extract<ResourceStorageConfig, { mode: 'wp-post' }>> = {}
) {
	const storage: Extract<ResourceStorageConfig, { mode: 'wp-post' }> = {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor', 'excerpt'],
                meta: {
                        rating: { type: 'integer', single: true },
                        tags: { type: 'array', single: false },
                },
		taxonomies: {
			genres: { taxonomy: 'book_genre' },
		},
		...overrides,
	};

	return {
		name: 'book',
		storage,
	} satisfies BuildWpPostRouteHandlersOptions['resource'];
}

function buildRouteContext(
	kind: ResourceControllerRouteMetadata['kind'],
	method: string
): RestControllerRouteStatementsContext {
	return {
		metadata: {
			method,
			path: '/kernel/v1/books',
			kind,
			cacheSegments: ['book'],
		},
		metadataHost: buildMetadataHost(),
	} satisfies RestControllerRouteStatementsContext;
}

type MetadataShape = ReturnType<ResourceMetadataHost['getMetadata']>;

function buildMetadataHost(): ResourceMetadataHost {
	let metadata: MetadataShape = {
		kind: 'resource-controller',
		name: 'book',
		identity: { type: 'number', param: 'id' },
		routes: [],
	} as unknown as MetadataShape;

	return {
		getMetadata: () => metadata,
		setMetadata: (next) => {
			metadata = next as MetadataShape;
		},
	} satisfies ResourceMetadataHost;
}

describe('buildWpPostRouteHandlers', () => {
	it('returns empty handlers when storage is not wp-post', () => {
		const handlers = buildWpPostRouteHandlers({
			resource: {
				name: 'option',
				storage: { mode: 'wp-option', option: 'demo_option' },
			},
			pascalName: 'Option',
			identity: IDENTITY,
			metadataKeys: METADATA_KEYS,
			errorCodeFactory: (suffix) => `option_${suffix}`,
		});

		expect(handlers.list).toBeUndefined();
		expect(handlers.get).toBeUndefined();
	});

	it('emits wp-post list route statements with pagination and metadata', () => {
		const handlers = buildWpPostRouteHandlers({
			resource: buildResource(),
			pascalName: 'Book',
			identity: IDENTITY,
			metadataKeys: METADATA_KEYS,
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		const context = buildRouteContext('list', 'GET');
		const statements = handlers.list?.(context);

		expect(statements).toBeDefined();
		expect(statements).not.toBeNull();
		const resolvedList = statements ?? [];
		expect(resolvedList).toMatchSnapshot('wp-post-list-route');
	});

	it('emits wp-post get route statements with identity guard and cache events', () => {
		const handlers = buildWpPostRouteHandlers({
			resource: buildResource(),
			pascalName: 'Book',
			identity: IDENTITY,
			metadataKeys: METADATA_KEYS,
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		const context = buildRouteContext('get', 'GET');
		const statements = handlers.get?.(context);

		expect(statements).toBeDefined();
		expect(statements).not.toBeNull();
		const resolvedGet = statements ?? [];
		expect(resolvedGet).toMatchSnapshot('wp-post-get-route');
	});

	it('delegates to mutation route factories for create/update/remove', () => {
		const handlers = buildWpPostRouteHandlers({
			resource: buildResource(),
			pascalName: 'Book',
			identity: IDENTITY,
			metadataKeys: METADATA_KEYS,
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		const create = handlers.create?.(buildRouteContext('create', 'POST'));
		const update = handlers.update?.(buildRouteContext('update', 'PUT'));
		const remove = handlers.remove?.(buildRouteContext('remove', 'DELETE'));

		expect(create).toBeDefined();
		expect(update).toBeDefined();
		expect(remove).toBeDefined();
		const resolvedCreate = create ?? [];
		const resolvedUpdate = update ?? [];
		const resolvedRemove = remove ?? [];
		expect(resolvedCreate).toMatchSnapshot('wp-post-create-route');
		expect(resolvedUpdate).toMatchSnapshot('wp-post-update-route');
		expect(resolvedRemove).toMatchSnapshot('wp-post-remove-route');
	});
});
