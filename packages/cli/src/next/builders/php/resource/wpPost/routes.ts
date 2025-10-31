import {
	buildWpPostRouteBundle,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';

export interface ResolveWpPostRouteBundleOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function resolveWpPostRouteBundle(
	options: ResolveWpPostRouteBundleOptions
): WpPostRouteBundle | undefined {
	if (options.resource.storage?.mode !== 'wp-post') {
		return undefined;
	}

	return buildWpPostRouteBundle({
		resource: options.resource,
		pascalName: options.pascalName,
		identity: options.identity,
		errorCodeFactory: options.errorCodeFactory,
	});
}
