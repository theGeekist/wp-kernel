import {
	type BuildResourceControllerRouteSetOptions,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRouteTransientHandlers,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import type { IRResource, IRRoute } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';

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
	readonly wpPostRouteBundle?: WpPostRouteBundle;
}

/**
 * Builds route set options for WordPress REST controller generation.
 *
 * Resolves storage-specific route handlers (WP_Post, wp-option, transient) and
 * assembles configuration for generating REST route registration code. Maps
 * resource storage mode to appropriate handler bundles.
 *
 * @param    context - Context containing resource, route, identity, and handler artifacts
 * @returns Route set options without execution plan (plan added separately)
 * @category AST Builders
 */
export function buildRouteSetOptions(
	context: BuildRouteSetOptionsContext
): Omit<BuildResourceControllerRouteSetOptions, 'plan'> {
	const storageMode = context.resource.storage?.mode;

	return {
		storageMode,
		handlers: resolveRouteHandlers(context),
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

function resolveRouteHandlers(
	context: BuildRouteSetOptionsContext
): RestControllerRouteHandlers | undefined {
	if (context.resource.storage?.mode === 'wp-post') {
		return context.wpPostRouteBundle?.routeHandlers;
	}

	return context.storageArtifacts.routeHandlers;
}
