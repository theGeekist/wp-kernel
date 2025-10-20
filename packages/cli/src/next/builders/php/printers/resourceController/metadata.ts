import { determineRouteKind, type ResourceRouteKind } from '../routes';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../ast/types';
import type { IRRoute } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../identity';

export interface CreateRouteMetadataOptions {
	readonly routes: readonly IRRoute[];
	readonly identity: ResolvedIdentity;
	readonly canonicalBasePaths: Set<string>;
}

export type RouteMetadataKind = ResourceRouteKind | 'custom';

export function createRouteMetadata(
	options: CreateRouteMetadataOptions
): ResourceControllerMetadata['routes'] {
	const { routes, identity, canonicalBasePaths } = options;

	return routes.map<ResourceControllerRouteMetadata>((route) => {
		const kind =
			determineRouteKind(route, identity.param, canonicalBasePaths) ??
			'custom';

		return {
			method: route.method,
			path: route.path,
			kind,
		};
	});
}
