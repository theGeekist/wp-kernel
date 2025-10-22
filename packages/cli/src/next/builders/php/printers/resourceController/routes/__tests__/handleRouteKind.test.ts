import { PHP_INDENT, PhpMethodBodyBuilder } from '../../../../ast/templates';
import type { ResourceMetadataHost } from '../../../../ast/factories/cacheMetadata';
import type { IRResource } from '../../../../../../../ir/types';
import { handleRouteKind } from '../handleRouteKind';

function createMetadataHost(): ResourceMetadataHost {
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

function createResource(storage: IRResource['storage']): IRResource {
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
			body: new PhpMethodBodyBuilder(PHP_INDENT, 1),
			indentLevel: 1,
			resource: createResource({
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
			metadataHost: createMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(handleRouteKind({ ...options, routeKind: 'create' })).toBe(true);
		expect(handleRouteKind({ ...options, routeKind: 'update' })).toBe(true);
		expect(handleRouteKind({ ...options, routeKind: 'remove' })).toBe(true);
	});

	it('returns false for mutation kinds when storage is unsupported', () => {
		const options = {
			body: new PhpMethodBodyBuilder(PHP_INDENT, 1),
			indentLevel: 1,
			resource: createResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: createMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(handleRouteKind({ ...options, routeKind: 'create' })).toBe(
			false
		);
		expect(handleRouteKind({ ...options, routeKind: 'update' })).toBe(
			false
		);
		expect(handleRouteKind({ ...options, routeKind: 'remove' })).toBe(
			false
		);
	});

	it('returns false for unsupported kinds', () => {
		const options = {
			body: new PhpMethodBodyBuilder(PHP_INDENT, 1),
			indentLevel: 1,
			resource: createResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: createMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(handleRouteKind({ ...options, routeKind: 'custom' })).toBe(
			false
		);
	});

	it('delegates list/get routes for wp-taxonomy resources', () => {
		const options = {
			body: new PhpMethodBodyBuilder(PHP_INDENT, 1),
			indentLevel: 1,
			resource: createResource({
				mode: 'wp-taxonomy',
				taxonomy: 'book_genre',
				hierarchical: false,
			} as IRResource['storage']),
			identity: { type: 'string', param: 'slug' } as const,
			pascalName: 'BookGenre',
			errorCodeFactory: (suffix: string) => `taxonomy_${suffix}`,
			metadataHost: createMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(handleRouteKind({ ...options, routeKind: 'list' })).toBe(true);
		expect(handleRouteKind({ ...options, routeKind: 'get' })).toBe(true);
	});
});
