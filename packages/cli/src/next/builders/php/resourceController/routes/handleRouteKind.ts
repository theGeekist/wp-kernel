import type { ResourceMetadataHost, PhpStmt } from '@wpkernel/php-json-ast';
import type { ResolvedIdentity } from '../../identity';
import type { RouteMetadataKind } from '../metadata';
import type { IRResource } from '../../../../../ir/types';
import {
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements as buildRemoveRouteStatements,
	WP_POST_MUTATION_CONTRACT,
} from '../../resource/wpPost/mutations';
import type {
	BuildCreateRouteStatementsOptions,
	BuildUpdateRouteStatementsOptions,
	BuildDeleteRouteStatementsOptions as BuildRemoveRouteStatementsOptions,
} from '../../resource/wpPost/mutations/routes';
import { buildGetRouteStatements } from './get';
import { buildListRouteStatements } from './list';

export interface HandleRouteKindOptions {
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
	readonly routeKind: RouteMetadataKind;
}

export function buildRouteKindStatements(
	options: HandleRouteKindOptions
): PhpStmt[] | null {
	switch (options.routeKind) {
		case 'list':
			return buildListRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataHost: options.metadataHost,
				cacheSegments: options.cacheSegments,
			});
		case 'get':
			return buildGetRouteStatements({
				resource: options.resource,
				identity: options.identity,
				pascalName: options.pascalName,
				errorCodeFactory: options.errorCodeFactory,
				metadataHost: options.metadataHost,
				cacheSegments: options.cacheSegments,
			});
		case 'create':
			return buildCreateRouteStatements(buildCreateOptions(options));
		case 'update':
			return buildUpdateRouteStatements(buildUpdateOptions(options));
		case 'remove':
			return buildRemoveRouteStatements(buildRemoveOptions(options));
		default:
			return null;
	}
}

function buildCreateOptions(
	options: HandleRouteKindOptions
): BuildCreateRouteStatementsOptions {
	return {
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
	};
}

function buildUpdateOptions(
	options: HandleRouteKindOptions
): BuildUpdateRouteStatementsOptions {
	return {
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
		identity: options.identity,
	};
}

function buildRemoveOptions(
	options: HandleRouteKindOptions
): BuildRemoveRouteStatementsOptions {
	return {
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
		identity: options.identity,
	};
}
