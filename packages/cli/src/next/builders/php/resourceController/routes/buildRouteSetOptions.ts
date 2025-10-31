import {
	type BuildResourceControllerRouteSetOptions,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type TransientStorageArtifacts,
	buildWpTaxonomyQueryRouteBundle,
	ensureWpTaxonomyStorage,
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
import { buildWpOptionStorageArtifacts } from '@wpkernel/wp-json-ast';
import { ensureWpOptionStorage } from '../../resource/wpOption/shared';

interface BuildRouteSetOptionsContext {
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly transientArtifacts?: TransientStorageArtifacts;
}

export function buildRouteSetOptions(
	context: BuildRouteSetOptionsContext
): Omit<BuildResourceControllerRouteSetOptions, 'plan'> {
	const storageMode = context.resource.storage?.mode;
	const taxonomyHandlers = buildTaxonomyRouteHandlers(context);

	return {
		storageMode,
		handlers: taxonomyHandlers ?? buildDefaultHandlers(context),
		optionHandlers: buildOptionHandlers(context),
		transientHandlers:
			storageMode === 'transient'
				? context.transientArtifacts?.routeHandlers
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

function buildTaxonomyRouteHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteHandlers | undefined {
	if (context.resource.storage?.mode !== 'wp-taxonomy') {
		return undefined;
	}

	const storage = ensureWpTaxonomyStorage(context.resource.storage, {
		resourceName: context.resource.name,
	});

	const bundle = buildWpTaxonomyQueryRouteBundle({
		pascalName: context.pascalName,
		resourceName: context.resource.name,
		storage,
		identity: context.identity,
		errorCodeFactory: context.errorCodeFactory,
	});

	return bundle.routeHandlers;
}

function buildOptionHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteOptionHandlers | undefined {
	if (context.resource.storage?.mode !== 'wp-option') {
		return undefined;
	}

	const storage = ensureWpOptionStorage(context.resource);

	const artifacts = buildWpOptionStorageArtifacts({
		pascalName: context.pascalName,
		optionName: storage.option,
		errorCodeFactory: context.errorCodeFactory,
	});

	return artifacts.routeHandlers;
}
