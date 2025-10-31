import type { RestControllerRouteHandlers } from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import type { WpTaxonomyStorageConfig } from '../helpers';
import { buildWpTaxonomyListRouteStatements } from './list';
import { buildWpTaxonomyGetRouteStatements } from './get';

export interface BuildWpTaxonomyQueryRouteBundleOptions {
	readonly pascalName: string;
	readonly storage: WpTaxonomyStorageConfig;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly resourceName?: string;
}

export interface WpTaxonomyQueryRouteBundle {
	readonly routeHandlers: RestControllerRouteHandlers;
}

export function buildWpTaxonomyQueryRouteBundle(
	options: BuildWpTaxonomyQueryRouteBundleOptions
): WpTaxonomyQueryRouteBundle {
	const buildList: RestControllerRouteHandlers['list'] = (context) =>
		buildWpTaxonomyListRouteStatements({
			pascalName: options.pascalName,
			storage: options.storage,
			resourceName: options.resourceName,
			metadataHost: context.metadataHost,
			cacheSegments: context.metadata.cacheSegments ?? [],
		});

	const buildGet: RestControllerRouteHandlers['get'] = (context) =>
		buildWpTaxonomyGetRouteStatements({
			pascalName: options.pascalName,
			storage: options.storage,
			resourceName: options.resourceName,
			identity: options.identity,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: context.metadataHost,
			cacheSegments: context.metadata.cacheSegments ?? [],
		});

	return {
		routeHandlers: {
			list: buildList,
			get: buildGet,
		},
	} satisfies WpTaxonomyQueryRouteBundle;
}
