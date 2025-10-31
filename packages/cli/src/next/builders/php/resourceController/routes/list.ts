import { type PhpStmt } from '@wpkernel/php-json-ast';
import type { ResourceMetadataHost } from '@wpkernel/wp-json-ast';
import { buildWpTaxonomyListRouteStatements } from '../../resource';
import type { IRResource } from '../../../../ir/publicTypes';

export interface BuildListRouteStatementsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildListRouteStatements(
	options: BuildListRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage) {
		return null;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyListRouteStatements({
			resource: options.resource,
			pascalName: options.pascalName,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	return null;
}
