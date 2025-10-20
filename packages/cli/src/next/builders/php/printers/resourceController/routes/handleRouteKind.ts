import type { PhpMethodBodyBuilder } from '../../../ast/templates';
import type { ResolvedIdentity } from '../../identity';
import type { RouteMetadataKind } from '../metadata';
import type { ResourceMetadataHost } from '../../../ast/factories/cacheMetadata';
import type { IRResource } from '../../../../../../ir/types';
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
			return buildListRouteBody(createListOptions(options));
		}
		case 'get': {
			return buildGetRouteBody(createGetOptions(options));
		}
		default:
			return false;
	}
}

function createListOptions(
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

function createGetOptions(
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
