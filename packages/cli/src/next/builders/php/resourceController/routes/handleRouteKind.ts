import type {
	PhpMethodBodyBuilder,
	ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import type { ResolvedIdentity } from '../../identity';
import type { RouteMetadataKind } from '../metadata';
import type { IRResource } from '../../../../../ir/types';
import {
	buildCreateRouteBody,
	buildUpdateRouteBody,
	buildDeleteRouteBody as buildRemoveRouteBody,
	WP_POST_MUTATION_CONTRACT,
} from '../../resource/wpPost/mutations';
import type {
	BuildCreateRouteBodyOptions,
	BuildUpdateRouteBodyOptions,
	BuildDeleteRouteBodyOptions as BuildRemoveRouteBodyOptions,
} from '../../resource/wpPost/mutations/routes';
import type { BuildGetRouteBodyOptions } from './get';
import { buildGetRouteBody } from './get';
import type { BuildListRouteBodyOptions } from './list';
import { buildListRouteBody } from './list';

export interface HandleRouteKindOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
	readonly routeKind: RouteMetadataKind;
}

export function handleRouteKind(options: HandleRouteKindOptions): boolean {
	switch (options.routeKind) {
		case 'list': {
			return buildListRouteBody(buildListOptions(options));
		}
		case 'get': {
			return buildGetRouteBody(buildGetOptions(options));
		}
		case 'create': {
			return buildCreateRouteBody(buildCreateOptions(options));
		}
		case 'update': {
			return buildUpdateRouteBody(buildUpdateOptions(options));
		}
		case 'remove': {
			return buildRemoveRouteBody(buildRemoveOptions(options));
		}
		default:
			return false;
	}
}

function buildListOptions(
	options: HandleRouteKindOptions
): BuildListRouteBodyOptions {
	return {
		body: options.body,
		indentLevel: options.indentLevel,
		resource: options.resource,
		pascalName: options.pascalName,
		metadataHost: options.metadataHost,
		cacheSegments: options.cacheSegments,
	};
}

function buildGetOptions(
	options: HandleRouteKindOptions
): BuildGetRouteBodyOptions {
	return {
		body: options.body,
		indentLevel: options.indentLevel,
		resource: options.resource,
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
		metadataHost: options.metadataHost,
		cacheSegments: options.cacheSegments,
	};
}

function buildCreateOptions(
	options: HandleRouteKindOptions
): BuildCreateRouteBodyOptions {
	return {
		body: options.body,
		indentLevel: options.indentLevel,
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
	};
}

function buildUpdateOptions(
	options: HandleRouteKindOptions
): BuildUpdateRouteBodyOptions {
	return {
		body: options.body,
		indentLevel: options.indentLevel,
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
		identity: options.identity,
	};
}

function buildRemoveOptions(
	options: HandleRouteKindOptions
): BuildRemoveRouteBodyOptions {
	return {
		body: options.body,
		indentLevel: options.indentLevel,
		resource: options.resource,
		pascalName: options.pascalName,
		metadataKeys: WP_POST_MUTATION_CONTRACT.metadataKeys,
		identity: options.identity,
	};
}
