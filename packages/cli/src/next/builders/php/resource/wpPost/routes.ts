import {
	buildWpPostRouteBundle,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../identity';

export interface CreatePhpWpPostRoutesHelperOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function createPhpWpPostRoutesHelper(
	options: CreatePhpWpPostRoutesHelperOptions
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
