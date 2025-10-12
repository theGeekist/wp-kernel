import type { IRResource, IRRoute } from '../../../ir';

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

export interface IdentityConfig {
	type: 'number' | 'string';
	param: string;
}
