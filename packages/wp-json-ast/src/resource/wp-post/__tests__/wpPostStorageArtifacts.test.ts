import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import { buildWpPostStorageArtifacts } from '../buildWpPostStorageArtifacts';
import type { MutationMetadataKeys } from '../mutation';
import type { ResolvedIdentity } from '../../../pipeline/identity';

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
	} satisfies Parameters<typeof buildWpPostStorageArtifacts>[0]['resource'];
}

describe('buildWpPostStorageArtifacts', () => {
	it('returns wp-post route handlers for list/get/create/update/remove', () => {
		const artifacts = buildWpPostStorageArtifacts({
			resource: buildResource(),
			pascalName: 'Book',
			identity: IDENTITY,
			metadataKeys: METADATA_KEYS,
			errorCodeFactory: (suffix) => `book_${suffix}`,
		});

		expect(typeof artifacts.routeHandlers.list).toBe('function');
		expect(typeof artifacts.routeHandlers.get).toBe('function');
		expect(typeof artifacts.routeHandlers.create).toBe('function');
		expect(typeof artifacts.routeHandlers.update).toBe('function');
		expect(typeof artifacts.routeHandlers.remove).toBe('function');
	});
});
