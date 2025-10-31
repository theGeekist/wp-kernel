import {
	type BuildResourceControllerRouteSetOptions,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRouteTransientHandlers,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRRoute } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';
import {
	WP_POST_MUTATION_CONTRACT,
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements as buildRemoveRouteStatements,
} from '../../resource/wpPost/mutations';
import { buildListRouteStatements } from './list';
import { buildGetRouteStatements } from './get';

interface BuildRouteSetOptionsContext {
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly storageArtifacts: {
		readonly routeHandlers?: RestControllerRouteHandlers;
		readonly optionHandlers?: RestControllerRouteOptionHandlers;
		readonly transientHandlers?: RestControllerRouteTransientHandlers;
	};
}

export function buildRouteSetOptions(
	context: BuildRouteSetOptionsContext
): Omit<BuildResourceControllerRouteSetOptions, 'plan'> {
	const storageMode = context.resource.storage?.mode;

	return {
		storageMode,
		handlers:
			context.storageArtifacts.routeHandlers ??
			buildDefaultHandlers(context),
		optionHandlers:
			storageMode === 'wp-option'
				? context.storageArtifacts.optionHandlers
				: undefined,
		transientHandlers:
			storageMode === 'transient'
				? context.storageArtifacts.transientHandlers
				: undefined,
	} satisfies Omit<BuildResourceControllerRouteSetOptions, 'plan'>;
}

function buildDefaultHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteHandlers {
	return {
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
}
