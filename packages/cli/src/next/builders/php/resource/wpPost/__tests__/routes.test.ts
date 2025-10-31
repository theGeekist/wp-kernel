import {
	buildWpPostRouteBundle,
	type ResourceMetadataHost,
} from '@wpkernel/wp-json-ast';
import { resolveWpPostRouteBundle } from '../routes';
import type { IRResource } from '../../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../../identity';

describe('resolveWpPostRouteBundle', () => {
	const identity: ResolvedIdentity = { type: 'number', param: 'id' };
	const errorCodeFactory = (suffix: string) => `book_${suffix}`;

	function buildResource(storage?: IRResource['storage']): IRResource {
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

	it('returns undefined when storage mode is not wp-post', () => {
		const resource = buildResource({
			mode: 'wp-option',
			option: 'demo_option',
		});

		expect(
			resolveWpPostRouteBundle({
				resource,
				pascalName: 'Book',
				identity,
				errorCodeFactory,
			})
		).toBeUndefined();
	});

	it('returns the wp-post route bundle when storage mode is wp-post', () => {
		const resource = buildResource({
			mode: 'wp-post',
			postType: 'book',
			statuses: [],
			supports: [],
			meta: {},
			taxonomies: {},
		} as IRResource['storage']);

		const expected = buildWpPostRouteBundle({
			resource,
			pascalName: 'Book',
			identity,
			errorCodeFactory,
		});

		const bundle = resolveWpPostRouteBundle({
			resource,
			pascalName: 'Book',
			identity,
			errorCodeFactory,
		});

		expect(bundle).toBeDefined();
		expect(bundle?.helperMethods).toEqual(expected.helperMethods);
		expect(bundle?.mutationMetadata).toEqual(expected.mutationMetadata);
		expect(Object.keys(bundle?.routeHandlers ?? {})).toEqual(
			Object.keys(expected.routeHandlers)
		);

		const routeContext = {
			metadata: {
				method: 'GET',
				path: '/kernel/v1/books',
				kind: 'list',
				cacheSegments: [],
			},
			metadataHost: buildMetadataHost(),
		} as const;

		expect(bundle?.routeHandlers.list?.(routeContext)).toEqual(
			expected.routeHandlers.list?.(routeContext)
		);
	});
});
