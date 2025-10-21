import { determineRouteKind, type ResourceRouteKind } from '../routes';
import {
	WP_POST_MUTATION_CONTRACT,
	type ResourceMutationContract,
} from '../resource/wpPost/mutations';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../ast/types';
import type { IRResource, IRRoute } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../identity';

export interface CreateRouteMetadataOptions {
	readonly routes: readonly IRRoute[];
	readonly identity: ResolvedIdentity;
	readonly canonicalBasePaths: Set<string>;
	readonly resource: IRResource;
}

export type RouteMetadataKind = ResourceRouteKind | 'custom';

export function createRouteMetadata(
	options: CreateRouteMetadataOptions
): ResourceControllerMetadata['routes'] {
	const { routes, identity, canonicalBasePaths, resource } = options;
	const mutationContract = resolveMutationContract(resource);

	return routes.map<ResourceControllerRouteMetadata>((route) => {
		const kind =
			determineRouteKind(route, identity.param, canonicalBasePaths) ??
			'custom';

		const metadata: ResourceControllerRouteMetadata = {
			method: route.method,
			path: route.path,
			kind,
		};

		if (!mutationContract) {
			return metadata;
		}

		const mutationKind = mapToMutationKind(kind);
		if (!mutationKind) {
			return metadata;
		}

		const cacheSegments = resolveMutationCacheSegments(resource, kind);
		const tags = createMutationTags(mutationContract, mutationKind);

		return {
			...metadata,
			cacheSegments,
			tags,
		};
	});
}

function resolveMutationContract(
	resource: IRResource
): ResourceMutationContract | undefined {
	if (resource.storage?.mode === 'wp-post') {
		return WP_POST_MUTATION_CONTRACT;
	}

	return undefined;
}

type MutationContract = typeof WP_POST_MUTATION_CONTRACT;
type MutationKind = MutationContract['mutationKinds'][number];

function mapToMutationKind(kind: RouteMetadataKind): MutationKind | undefined {
	switch (kind) {
		case 'create':
			return 'create';
		case 'update':
			return 'update';
		case 'remove':
			return 'delete';
		default:
			return undefined;
	}
}

function resolveMutationCacheSegments(
	resource: IRResource,
	kind: RouteMetadataKind
): readonly unknown[] {
	switch (kind) {
		case 'create':
			return resource.cacheKeys.create?.segments ?? [];
		case 'update':
			return resource.cacheKeys.update?.segments ?? [];
		case 'remove':
			return resource.cacheKeys.remove?.segments ?? [];
		default:
			return [];
	}
}

function createMutationTags(
	contract: MutationContract,
	kind: MutationKind
): Readonly<Record<string, string>> {
	return {
		[contract.metadataKeys.channelTag]: kind,
	} as const;
}
