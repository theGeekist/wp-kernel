import type { ResourceStorageConfig } from '@wpkernel/core/resource';
import { buildWpPostRouteBundle } from '../buildWpPostRouteBundle';
import { WP_POST_MUTATION_CONTRACT } from '../mutation';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import type { ResourceMetadataHost } from '../../../common/metadata';
import type { RestControllerRouteStatementsContext } from '../../../rest-controller/pipeline';

function createMetadataHost(): ResourceMetadataHost {
	let metadata = {
		kind: 'resource-controller' as const,
		name: 'book',
		identity: { type: 'number' as const, param: 'id' },
		routes: [],
	};

	return {
		getMetadata: () => metadata,
		setMetadata: (next) => {
			metadata = next as typeof metadata;
		},
	} satisfies ResourceMetadataHost;
}

describe('buildWpPostRouteBundle', () => {
	const storage: Extract<ResourceStorageConfig, { mode: 'wp-post' }> = {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor'],
                meta: {
                        subtitle: { type: 'string', single: true },
                },
		taxonomies: {
			category: { taxonomy: 'category' },
		},
	};

	const resource = {
		name: 'book',
		storage,
	} as const;

	const identity: ResolvedIdentity = { type: 'number', param: 'id' };
	const pascalName = 'Book';
	const errorCodeFactory = (suffix: string) => `book_${suffix}`;

	it('bundles wp-post route handlers and metadata', () => {
		const bundle = buildWpPostRouteBundle({
			resource,
			identity,
			pascalName,
			errorCodeFactory,
		});

		expect(bundle.metadata.mutationContract).toBe(
			WP_POST_MUTATION_CONTRACT
		);
		expect(bundle.helperMethods).toHaveLength(3);
		expect(bundle.helperMethods.map((method) => method.name.name)).toEqual([
			'syncBookMeta',
			'syncBookTaxonomies',
			'prepareBookResponse',
		]);
	});

	it('emits list route statements matching snapshot', () => {
		const bundle = buildWpPostRouteBundle({
			resource,
			identity,
			pascalName,
			errorCodeFactory,
		});

		const context: RestControllerRouteStatementsContext = {
			metadata: {
				method: 'GET',
				path: '/kernel/v1/books',
				kind: 'list',
				cacheSegments: [],
			},
			metadataHost: createMetadataHost(),
		};

		const statements = bundle.handlers.list?.(context);
		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('wp-post-list-route');
	});

	it('emits get route statements matching snapshot', () => {
		const bundle = buildWpPostRouteBundle({
			resource,
			identity,
			pascalName,
			errorCodeFactory,
		});

		const context: RestControllerRouteStatementsContext = {
			metadata: {
				method: 'GET',
				path: '/kernel/v1/books/:id',
				kind: 'get',
				cacheSegments: [],
			},
			metadataHost: createMetadataHost(),
		};

		const statements = bundle.handlers.get?.(context);
		expect(statements).not.toBeNull();
		expect(statements).toMatchSnapshot('wp-post-get-route');
	});
});
