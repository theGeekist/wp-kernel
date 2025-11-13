import {
	buildStorageArtifacts,
	resolveRouteMutationMetadata,
	buildCacheKeyPlan,
} from '../controller.storageArtifacts';
import type { ResourceStorageHelperState } from '../types';
import type { IRResource } from '../../../ir';

jest.mock('@wpkernel/wp-json-ast', () => ({
	buildResourceCacheKeysPlan: jest.fn().mockReturnValue('cache-plan'),
}));

const { buildResourceCacheKeysPlan } = jest.requireMock(
	'@wpkernel/wp-json-ast'
);

function createState(): ResourceStorageHelperState {
	return {
		transient: new Map(),
		wpOption: new Map(),
		wpTaxonomy: new Map(),
	};
}

function createResource(overrides: Partial<IRResource> = {}): IRResource {
	return {
		name: 'jobs',
		cacheKeys: {
			list: { segments: ['jobs'] },
			get: { segments: ['jobs', ':id'] },
			create: { segments: ['jobs', 'create'] },
			update: { segments: ['jobs', 'update'] },
			remove: { segments: ['jobs', 'remove'] },
		},
		...overrides,
	} as unknown as IRResource;
}

describe('controller storage artifacts', () => {
	it('returns taxonomy artifacts when state contains entries', () => {
		const state = createState();
		state.wpTaxonomy.set('jobs', {
			helperMethods: ['taxonomyMethod'],
			helperSignatures: ['taxonomySignature'],
			routeHandlers: ['taxonomyHandler'] as unknown as never,
		});

		const artifacts = buildStorageArtifacts({
			resource: createResource({ storage: { mode: 'wp-taxonomy' } }),
			storageState: state,
		});

		expect(artifacts).toEqual({
			helperMethods: ['taxonomyMethod'],
			helperSignatures: ['taxonomySignature'],
			routeHandlers: ['taxonomyHandler'],
		});
	});

	it('returns transient artifacts and empty signatures when missing state', () => {
		const state = createState();
		state.transient.set('jobs', {
			helperMethods: ['transientMethod'],
			routeHandlers: ['transientHandler'] as unknown as never,
		});

		const artifacts = buildStorageArtifacts({
			resource: createResource({ storage: { mode: 'transient' } }),
			storageState: state,
		});

		expect(artifacts).toEqual({
			helperMethods: ['transientMethod'],
			helperSignatures: [],
			transientHandlers: ['transientHandler'],
		});
	});

	it('returns default artifacts when resource has no storage mode', () => {
		const state = createState();
		const artifacts = buildStorageArtifacts({
			resource: createResource({ storage: undefined }),
			storageState: state,
		});

		expect(artifacts).toEqual({
			helperMethods: [],
			helperSignatures: [],
		});
	});

	it('resolves route mutation metadata for wp-post storage', () => {
		expect(
			resolveRouteMutationMetadata(
				createResource({ storage: { mode: 'wp-post' } })
			)
		).toEqual({ channelTag: 'resource.wpPost.mutation' });
		expect(
			resolveRouteMutationMetadata(
				createResource({ storage: { mode: 'transient' } })
			)
		).toBeUndefined();
	});

	it('builds cache key plan with optional segments removed when undefined', () => {
		const resource = createResource({
			cacheKeys: {
				list: { segments: ['jobs'] },
				get: { segments: ['jobs', ':id'] },
				create: undefined,
				update: undefined,
				remove: undefined,
			},
		});

		const result = buildCacheKeyPlan(resource);

		expect(result).toBe('cache-plan');
		expect(buildResourceCacheKeysPlan).toHaveBeenCalledWith({
			list: { segments: ['jobs'] },
			get: { segments: ['jobs', ':id'] },
		});
	});
});
