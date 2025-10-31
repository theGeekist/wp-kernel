import type { PhpStmt } from '@wpkernel/php-json-ast';
import {
	buildWpTaxonomyGetRouteStatements,
	type ResourceMetadataHost,
} from '@wpkernel/wp-json-ast';
import type { ResolvedIdentity } from '../../identity';
import type { IRResource } from '../../../../ir/publicTypes';

export interface BuildGetRouteStatementsOptions {
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildGetRouteStatements(
	options: BuildGetRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage) {
		return null;
	}

	if (storage.mode !== 'wp-taxonomy') {
		return null;
	}

	return buildWpTaxonomyGetRouteStatements({
		storage,
		resourceName: options.resource.name,
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
		metadataHost: options.metadataHost,
		cacheSegments: options.cacheSegments,
	});
}
