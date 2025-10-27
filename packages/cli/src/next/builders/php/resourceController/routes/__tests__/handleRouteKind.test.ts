import type { ResourceMetadataHost } from '@wpkernel/php-json-ast';
import type { IRResource, IRRoute } from '../../../../../ir/publicTypes';
import {
	buildRouteKindStatements,
	type HandleRouteKindOptions,
} from '../handleRouteKind';

type TestHandleRouteKindOptions = HandleRouteKindOptions & { route: IRRoute };
type HandleRouteBaseOptions = Omit<
	TestHandleRouteKindOptions,
	'route' | 'routeKind'
>;

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

function buildRoute(method: IRRoute['method']): IRRoute {
	return {
		method,
		path: '/kernel/v1/books',
		policy: undefined,
		transport: 'local',
		hash: `${method.toLowerCase()}-route`,
	};
}

function buildOptions(
	base: HandleRouteBaseOptions,
	extras: Pick<TestHandleRouteKindOptions, 'route' | 'routeKind'>
): TestHandleRouteKindOptions {
	return { ...base, ...extras };
}

describe('handleRouteKind', () => {
	it('delegates to mutation builders for wp-post resources', () => {
		const options: HandleRouteBaseOptions = {
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
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('POST'),
					routeKind: 'create',
				})
			)
		).not.toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('PUT'),
					routeKind: 'update',
				})
			)
		).not.toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('DELETE'),
					routeKind: 'remove',
				})
			)
		).not.toBeNull();
	});

	it('returns false for mutation kinds when storage is unsupported', () => {
		const options: HandleRouteBaseOptions = {
			resource: buildResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('POST'),
					routeKind: 'create',
				})
			)
		).toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('PUT'),
					routeKind: 'update',
				})
			)
		).toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('DELETE'),
					routeKind: 'remove',
				})
			)
		).toBeNull();
	});

	it('returns false for unsupported kinds', () => {
		const options: HandleRouteBaseOptions = {
			resource: buildResource(undefined),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'Book',
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('POST'),
					routeKind: 'custom',
				})
			)
		).toBeNull();
	});

	it('delegates list/get routes for wp-taxonomy resources', () => {
		const options: HandleRouteBaseOptions = {
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
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('GET'),
					routeKind: 'list',
				})
			)
		).not.toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: {
						...buildRoute('GET'),
						path: '/kernel/v1/books/:slug',
					},
					routeKind: 'get',
				})
			)
		).not.toBeNull();
	});

	it('maps wp-option routes based on HTTP method', () => {
		const options: HandleRouteBaseOptions = {
			resource: buildResource({
				mode: 'wp-option',
				option: 'demo_option',
			} as IRResource['storage']),
			identity: { type: 'number', param: 'id' } as const,
			pascalName: 'DemoOption',
			errorCodeFactory: (suffix: string) => `option_${suffix}`,
			metadataHost: buildMetadataHost(),
			cacheSegments: [],
		} as const;

		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('GET'),
					routeKind: 'list',
				})
			)
		).not.toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('PUT'),
					routeKind: 'update',
				})
			)
		).not.toBeNull();
		expect(
			buildRouteKindStatements(
				buildOptions(options, {
					route: buildRoute('DELETE'),
					routeKind: 'remove',
				})
			)
		).not.toBeNull();
	});
});
