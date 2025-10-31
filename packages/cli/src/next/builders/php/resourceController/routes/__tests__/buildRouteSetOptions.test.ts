import {
	buildResourceControllerRouteSet,
	buildTransientStorageArtifacts,
	resolveTransientKey,
	type ResourceMetadataHost,
	type ResolvedIdentity,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRRoute } from '../../../../../ir/publicTypes';
import { createPhpWpPostRoutesHelper } from '../../../resource/wpPost/routes';
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

	const transientArtifacts =
		resource.storage?.mode === 'transient'
			? buildTransientStorageArtifacts({
					pascalName,
					key: resolveTransientKey({
						resourceName: resource.name,
						namespace: '',
					}),
					identity,
					cacheSegments: resource.cacheKeys.get.segments,
					errorCodeFactory,
				})
			: undefined;

	const wpPostRouteBundle = createPhpWpPostRoutesHelper({
		resource,
		pascalName,
		identity,
		errorCodeFactory,
	});

	const options = buildRouteSetOptions({
		resource,
		route,
		identity,
		pascalName,
		errorCodeFactory,
		transientArtifacts,
		wpPostRouteBundle,
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
});
