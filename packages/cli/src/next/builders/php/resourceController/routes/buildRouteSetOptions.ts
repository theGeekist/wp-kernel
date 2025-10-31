import {
	type BuildResourceControllerRouteSetOptions,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type TransientStorageArtifacts,
	type WpPostRouteBundle,
	buildWpOptionStorageArtifacts,
	buildWpTaxonomyGetRouteStatements,
	buildWpTaxonomyListRouteStatements,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRRoute } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';
import { ensureWpOptionStorage } from '../../resource/wpOption/shared';
import { ensureWpTaxonomyStorage } from '../../resource/wpTaxonomy';

interface BuildRouteSetOptionsContext {
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly transientArtifacts?: TransientStorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
}

export function buildRouteSetOptions(
	context: BuildRouteSetOptionsContext
): Omit<BuildResourceControllerRouteSetOptions, 'plan'> {
	const storageMode = context.resource.storage?.mode;

	return {
		storageMode,
		handlers: resolveRouteHandlers(context),
		optionHandlers: buildOptionHandlers(context),
		transientHandlers:
			storageMode === 'transient'
				? context.transientArtifacts?.routeHandlers
				: undefined,
	} satisfies Omit<BuildResourceControllerRouteSetOptions, 'plan'>;
}

function resolveRouteHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteHandlers | undefined {
	if (context.resource.storage?.mode === 'wp-post') {
		return context.wpPostRouteBundle?.routeHandlers;
	}

	return buildFallbackHandlers(context);
}

function buildFallbackHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteHandlers | undefined {
	if (context.resource.storage?.mode !== 'wp-taxonomy') {
		return undefined;
	}

	return {
		list: (routeContext) =>
			buildWpTaxonomyListRouteStatements({
				storage: ensureWpTaxonomyStorage(context.resource.storage, {
					resourceName: context.resource.name,
				}),
				resourceName: context.resource.name,
				pascalName: context.pascalName,
				metadataHost: routeContext.metadataHost,
				cacheSegments: routeContext.metadata.cacheSegments ?? [],
			}),
		get: (routeContext) =>
			buildWpTaxonomyGetRouteStatements({
				storage: ensureWpTaxonomyStorage(context.resource.storage, {
					resourceName: context.resource.name,
				}),
				resourceName: context.resource.name,
				identity: context.identity,
				pascalName: context.pascalName,
				errorCodeFactory: context.errorCodeFactory,
				metadataHost: routeContext.metadataHost,
				cacheSegments: routeContext.metadata.cacheSegments ?? [],
			}),
	} satisfies RestControllerRouteHandlers;
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
