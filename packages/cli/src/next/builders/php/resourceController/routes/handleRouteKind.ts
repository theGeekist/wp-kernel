import type { ResourceMetadataHost, PhpStmt } from '@wpkernel/php-json-ast';
import type { ResolvedIdentity } from '../../identity';
import type { RouteMetadataKind } from '../metadata';
import type { IRResource, IRRoute } from '../../../../../ir/types';
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
import {
	buildWpOptionGetRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
} from '../../resource/wpOption';
import {
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientUnsupportedRouteStatements,
} from '../../resource/transient';

export interface HandleRouteKindOptions {
	readonly resource: IRResource;
	readonly route: IRRoute;
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
	const storage = options.resource.storage;
	if (storage?.mode === 'transient') {
		return buildTransientRouteStatements(options);
	}

	if (storage?.mode === 'wp-option') {
		return buildWpOptionRouteStatements(options);
	}

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

function buildWpOptionRouteStatements(
	options: HandleRouteKindOptions
): PhpStmt[] {
	switch (options.route.method) {
		case 'GET':
			return buildWpOptionGetRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
			});
		case 'POST':
		case 'PUT':
		case 'PATCH':
			return buildWpOptionUpdateRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
			});
		default:
			return buildWpOptionUnsupportedRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				errorCodeFactory: options.errorCodeFactory,
			});
	}
}

function buildTransientRouteStatements(
	options: HandleRouteKindOptions
): PhpStmt[] {
	switch (options.route.method) {
		case 'GET':
			return buildTransientGetRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataHost: options.metadataHost,
			});
		case 'POST':
		case 'PUT':
		case 'PATCH':
			return buildTransientSetRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataHost: options.metadataHost,
			});
		case 'DELETE':
			return buildTransientDeleteRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataHost: options.metadataHost,
			});
		default:
			return buildTransientUnsupportedRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataHost: options.metadataHost,
				errorCodeFactory: options.errorCodeFactory,
			});
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
