import {
	WP_POST_MUTATION_CONTRACT,
	buildCreateRouteStatements,
	buildDeleteRouteStatements as buildRemoveRouteStatements,
	buildUpdateRouteStatements,
	buildWpPostRouteBundle,
	routeUsesIdentity,
	type BuildResourceControllerRouteSetOptions,
	type ResourceControllerRouteMetadata,
	type ResourceMetadataHost,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRouteStatementsBuilder,
	type RestControllerRouteTransientHandlers,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRRoute } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';
import { buildListRouteStatements } from './list';
import { buildGetRouteStatements } from './get';
import {
	buildWpOptionGetRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientUnsupportedRouteStatements,
} from '@wpkernel/wp-json-ast';
import { ensureWpOptionStorage } from '../../resource/wpOption/shared';

interface BuildRouteSetOptionsContext {
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function buildRouteSetOptions(
	context: BuildRouteSetOptionsContext
): Omit<BuildResourceControllerRouteSetOptions, 'plan'> {
	const storageMode = context.resource.storage?.mode;
	const wpPostBundle =
		storageMode === 'wp-post'
			? buildWpPostRouteBundle({
					resource: context.resource,
					identity: context.identity,
					pascalName: context.pascalName,
					errorCodeFactory: context.errorCodeFactory,
				})
			: undefined;

	return {
		storageMode,
		handlers: buildDefaultHandlers({
			...context,
			wpPostHandlers: wpPostBundle?.handlers,
		}),
		optionHandlers: buildOptionHandlers(context),
		transientHandlers: buildTransientHandlers(context),
	} satisfies Omit<BuildResourceControllerRouteSetOptions, 'plan'>;
}

interface BuildDefaultHandlersOptions extends BuildRouteSetOptionsContext {
	readonly wpPostHandlers?: RestControllerRouteHandlers;
}

function buildDefaultHandlers(
	context: BuildDefaultHandlersOptions
): RestControllerRouteHandlers {
	const fallbackHandlers: RestControllerRouteHandlers = {
		list: (routeContext) =>
			buildListRouteStatements({
				resource: context.resource,
				pascalName: context.pascalName,
				metadataHost: routeContext.metadataHost,
				cacheSegments: routeContext.metadata.cacheSegments ?? [],
			}),
		get: (routeContext) =>
			buildGetRouteStatements({
				resource: context.resource,
				identity: context.identity,
				pascalName: context.pascalName,
				errorCodeFactory: context.errorCodeFactory,
				metadataHost: routeContext.metadataHost,
				cacheSegments: routeContext.metadata.cacheSegments ?? [],
			}),
		create: () =>
			buildCreateRouteStatements({
				resource: context.resource,
				pascalName: context.pascalName,
				metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
			}),
		update: () =>
			buildUpdateRouteStatements({
				resource: context.resource,
				pascalName: context.pascalName,
				metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
				identity: context.identity,
			}),
		remove: () =>
			buildRemoveRouteStatements({
				resource: context.resource,
				pascalName: context.pascalName,
				metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
				identity: context.identity,
			}),
	} satisfies RestControllerRouteHandlers;

	if (!context.wpPostHandlers) {
		return fallbackHandlers;
	}

	return {
		...fallbackHandlers,
		...context.wpPostHandlers,
	} satisfies RestControllerRouteHandlers;
}

function buildOptionHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteOptionHandlers | undefined {
	if (context.resource.storage?.mode !== 'wp-option') {
		return undefined;
	}

	const storage = ensureWpOptionStorage(context.resource);

	return {
		get: () =>
			buildWpOptionGetRouteStatements({
				pascalName: context.pascalName,
				optionName: storage.option,
			}),
		update: () =>
			buildWpOptionUpdateRouteStatements({
				pascalName: context.pascalName,
				optionName: storage.option,
			}),
		unsupported: () =>
			buildWpOptionUnsupportedRouteStatements({
				pascalName: context.pascalName,
				optionName: storage.option,
				errorCodeFactory: context.errorCodeFactory,
			}),
	} satisfies RestControllerRouteOptionHandlers;
}

function buildTransientHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteTransientHandlers | undefined {
	if (context.resource.storage?.mode !== 'transient') {
		return undefined;
	}

	const buildBaseOptions = (
		host: ResourceMetadataHost,
		metadataKind: ResourceControllerRouteMetadata['kind']
	) => ({
		pascalName: context.pascalName,
		metadataHost: host,
		identity: context.identity,
		cacheSegments: context.resource.cacheKeys.get.segments,
		usesIdentity: routeUsesIdentity({
			route: {
				method: context.route.method,
				path: context.route.path,
			},
			routeKind: metadataKind,
			identity: { param: context.identity.param },
		}),
	});

	const wrap =
		(
			builder: (
				options: ReturnType<typeof buildBaseOptions>
			) => ReturnType<RestControllerRouteStatementsBuilder>
		): RestControllerRouteStatementsBuilder =>
		(routeContext) =>
			builder(
				buildBaseOptions(
					routeContext.metadataHost,
					routeContext.metadata.kind
				)
			);

	return {
		get: wrap(buildTransientGetRouteStatements),
		set: wrap(buildTransientSetRouteStatements),
		delete: wrap(buildTransientDeleteRouteStatements),
		unsupported: (routeContext) =>
			buildTransientUnsupportedRouteStatements({
				...buildBaseOptions(
					routeContext.metadataHost,
					routeContext.metadata.kind
				),
				errorCodeFactory: context.errorCodeFactory,
			}),
	} satisfies RestControllerRouteTransientHandlers;
}
