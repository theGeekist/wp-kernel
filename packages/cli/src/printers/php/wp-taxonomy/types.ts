import type { IRResource, IRRoute } from '../../../ir';
import type { PhpFileBuilder } from '../builder';
import type { ResolvedIdentity } from '../identity';

export type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface WpTaxonomyRouteDefinition {
	route: IRRoute;
	methodName: string;
}

export type WpTaxonomyRouteKind =
	| 'list'
	| 'get'
	| 'create'
	| 'update'
	| 'remove'
	| 'unsupported';

export interface WpTaxonomyContext {
	builder: PhpFileBuilder;
	resource: IRResource;
	storage: WpTaxonomyStorage;
	pascalName: string;
	identity: ResolvedIdentity;
	taxonomy: string;
	hierarchical: boolean;
	errorCode: (suffix: string) => string;
	titleCaseName: () => string;
}
