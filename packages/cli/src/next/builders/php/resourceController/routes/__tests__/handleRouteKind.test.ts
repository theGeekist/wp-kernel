import type { ResourceMetadataHost } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../../ir/types';
import { buildRouteKindStatements } from '../handleRouteKind';

function buildMetadataHost(): ResourceMetadataHost {
	return {
		getMetadata: () => ({
			kind: 'resource-controller',
			name: 'book',
			identity: { type: 'number', param: 'id' },
			routes: [],
		}),
		setMetadata: jest.fn(),
	};
}

function buildResource(storage: IRResource['storage']): IRResource {
	return {
		name: 'book',
		schemaKey: 'book',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity: { type: 'number', param: 'id' },
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-hash',
		warnings: [],
	};
}

describe('handleRouteKind', () => {
	it('delegates to mutation builders for wp-post resources', () => {
		const options = {
			resource: buildResource({
				mode: 'wp-post',
				postType: 'book',
				statuses: [],
				supports: [],
				meta: {},
				taxonomies: {},
			} as IRResource['storage']),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'create',
			})
		).not.toBeNull();
		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'update',
			})
		).not.toBeNull();
		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'remove',
			})
		).not.toBeNull();
	});

	it('returns false for mutation kinds when storage is unsupported', () => {
		const options = {
			resource: buildResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'create',
			})
		).toBeNull();
		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'update',
			})
		).toBeNull();
		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'remove',
			})
		).toBeNull();
	});

	it('returns false for unsupported kinds', () => {
		const options = {
			resource: buildResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'custom',
			})
		).toBeNull();
	});

	it('delegates list/get routes for wp-taxonomy resources', () => {
		const options = {
			resource: buildResource({
				mode: 'wp-taxonomy',
				taxonomy: 'book_genre',
				hierarchical: false,
			} as IRResource['storage']),
			identity: { type: 'string', param: 'slug' } as const,
			pascalName: 'BookGenre',
			errorCodeFactory: (suffix: string) => `taxonomy_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'list',
			})
		).not.toBeNull();
		expect(
			buildRouteKindStatements({
				...options,
				routeKind: 'get',
			})
		).not.toBeNull();
	});
});
