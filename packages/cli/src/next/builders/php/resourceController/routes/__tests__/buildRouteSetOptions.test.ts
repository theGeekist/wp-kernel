import {
	buildResourceControllerRouteSet,
	buildTransientStorageArtifacts,
	buildWpOptionStorageArtifacts,
	buildWpTaxonomyQueryRouteBundle,
	resolveTransientKey,
	ensureWpTaxonomyStorage,
	type ResourceMetadataHost,
	type ResolvedIdentity,
} from '@wpkernel/wp-json-ast';
import { ensureWpOptionStorage } from '../../../resource/wpOption/shared';
import type { IRResource, IRRoute } from '../../../../../ir/publicTypes';
import { buildRouteSetOptions } from '../buildRouteSetOptions';

function buildMetadataHost(): ResourceMetadataHost {
	return {
		getMetadata: () => ({
			kind: 'resource-controller',
			name: 'book',
			identity: { type: 'number', param: 'id' },
			routes: [],
		}),
		setMetadata: () => {},
	} satisfies ResourceMetadataHost;
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
		capability: undefined,
		transport: 'local',
		hash: `${method.toLowerCase()}-route`,
	};
}

function buildPlan({
	resource,
	route,
}: {
	readonly resource: IRResource;
	readonly route: IRRoute;
}) {
	const identity: ResolvedIdentity = { type: 'number', param: 'id' };
	const pascalName = 'Book';
	const errorCodeFactory = (suffix: string) => `book_${suffix}`;

	const storageArtifacts = buildStorageArtifacts({
		resource,
		identity,
		pascalName,
		errorCodeFactory,
	});

	const options = buildRouteSetOptions({
		resource,
		route,
		identity,
		pascalName,
		errorCodeFactory,
		storageArtifacts,
	});

	return buildResourceControllerRouteSet({
		plan: {
			definition: {
				method: route.method,
				path: route.path,
				capability: route.capability,
			},
			methodName: 'handle',
		},
		...options,
	});
}

function buildStorageArtifacts({
	resource,
	identity,
	pascalName,
	errorCodeFactory,
}: {
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}): {
	readonly routeHandlers?: ReturnType<
		typeof buildWpTaxonomyQueryRouteBundle
	>['routeHandlers'];
	readonly optionHandlers?: ReturnType<
		typeof buildWpOptionStorageArtifacts
	>['routeHandlers'];
	readonly transientHandlers?: ReturnType<
		typeof buildTransientStorageArtifacts
	>['routeHandlers'];
} {
	switch (resource.storage?.mode) {
		case 'wp-taxonomy': {
			const storage = ensureWpTaxonomyStorage(resource.storage, {
				resourceName: resource.name,
			});

			return {
				routeHandlers: buildWpTaxonomyQueryRouteBundle({
					pascalName,
					resourceName: resource.name,
					storage,
					identity,
					errorCodeFactory,
				}).routeHandlers,
			};
		}
		case 'transient': {
			const artifacts = buildTransientStorageArtifacts({
				pascalName,
				key: resolveTransientKey({
					resourceName: resource.name,
					namespace: '',
				}),
				identity,
				cacheSegments: resource.cacheKeys.get.segments,
				errorCodeFactory,
			});

			return {
				transientHandlers: artifacts.routeHandlers,
			};
		}
		case 'wp-option': {
			const storage = ensureWpOptionStorage(resource);
			const artifacts = buildWpOptionStorageArtifacts({
				pascalName,
				optionName: storage.option,
				errorCodeFactory,
			});

			return {
				optionHandlers: artifacts.routeHandlers,
			};
		}
		default:
			return {};
	}
}

describe('buildRouteSetOptions', () => {
	it('delegates to wp-post mutation routes', () => {
		const resource = buildResource({
			mode: 'wp-post',
			postType: 'book',
			statuses: [],
			supports: [],
			meta: {},
			taxonomies: {},
		} as IRResource['storage']);
		const route = buildRoute('POST');

		const plan = buildPlan({ resource, route });
		const statements = plan.buildStatements({
			metadata: {
				method: route.method,
				path: route.path,
				kind: 'create',
			},
			metadataHost: buildMetadataHost(),
		});

		expect(statements).not.toBeNull();
	});

	it('delegates wp-option routes based on HTTP method', () => {
		const resource = buildResource({
			mode: 'wp-option',
			option: 'demo_option',
		} as IRResource['storage']);
		const route = buildRoute('GET');

		const plan = buildPlan({ resource, route });
		const statements = plan.buildStatements({
			metadata: {
				method: route.method,
				path: route.path,
				kind: 'list',
			},
			metadataHost: buildMetadataHost(),
		});

		expect(statements).not.toBeNull();
	});

	it('delegates transient routes based on HTTP method', () => {
		const resource = buildResource({
			mode: 'transient',
			transient: 'demo_transient',
		} as IRResource['storage']);
		const route = buildRoute('DELETE');

		const plan = buildPlan({ resource, route });
		const statements = plan.buildStatements({
			metadata: {
				method: route.method,
				path: route.path,
				kind: 'remove',
			},
			metadataHost: buildMetadataHost(),
		});

		expect(statements).not.toBeNull();
	});

	it('prefers storage-provided route handlers when available', () => {
		const resource = buildResource(undefined);
		const route = buildRoute('GET');
		const routeHandlers = {
			list: jest.fn(),
		} as const;

		const options = buildRouteSetOptions({
			resource,
			route,
			identity: { type: 'number', param: 'id' },
			pascalName: 'Book',
			errorCodeFactory: (suffix) => `book_${suffix}`,
			storageArtifacts: {
				routeHandlers,
				optionHandlers: undefined,
				transientHandlers: undefined,
			},
		});

		expect(options.handlers).toBe(routeHandlers);
	});
});
