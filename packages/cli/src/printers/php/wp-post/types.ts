import type { IRResource, IRRoute } from '../../../ir';
import type { ResolvedIdentity } from '../identity';

export type WpPostStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-post' }
>;

export interface WpPostRouteDefinition {
	route: IRRoute;
	methodName: string;
}

export type WpPostMetaDescriptor = {
	type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
	single?: boolean;
};

export type WpPostTaxonomyDescriptor = {
	taxonomy: string;
	hierarchical?: boolean;
	register?: boolean;
};

export type RouteKind = 'list' | 'get' | 'create' | 'update' | 'remove';

export type IdentityConfig = ResolvedIdentity;
