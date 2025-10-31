import type { RestControllerRouteHandlers } from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import type { RestControllerRouteStatementsContext } from '../../../rest-controller/pipeline';
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

interface RouteMetadataContext {
	readonly metadataHost: RestControllerRouteStatementsContext['metadataHost'];
	readonly cacheSegments: readonly unknown[];
}

export function buildWpTaxonomyQueryRouteBundle(
	options: BuildWpTaxonomyQueryRouteBundleOptions
): WpTaxonomyQueryRouteBundle {
	const resolveMetadataContext = (
		context: RestControllerRouteStatementsContext
	): RouteMetadataContext => ({
		metadataHost: context.metadataHost,
		cacheSegments: context.metadata.cacheSegments ?? [],
	});

	const buildList: RestControllerRouteHandlers['list'] = (context) => {
		const metadata = resolveMetadataContext(context);

		return buildWpTaxonomyListRouteStatements({
			pascalName: options.pascalName,
			storage: options.storage,
			resourceName: options.resourceName,
			metadataHost: metadata.metadataHost,
			cacheSegments: metadata.cacheSegments,
		});
	};

	const buildGet: RestControllerRouteHandlers['get'] = (context) => {
		const metadata = resolveMetadataContext(context);

		return buildWpTaxonomyGetRouteStatements({
			pascalName: options.pascalName,
			storage: options.storage,
			resourceName: options.resourceName,
			identity: options.identity,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: metadata.metadataHost,
			cacheSegments: metadata.cacheSegments,
		});
	};

	return {
		routeHandlers: {
			list: buildList,
			get: buildGet,
		},
	} satisfies WpTaxonomyQueryRouteBundle;
}
