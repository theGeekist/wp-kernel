import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import type {
	RestControllerRouteStatementsBuilder,
	RestControllerRouteTransientHandlers,
} from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import { routeUsesIdentity } from '../../../common/metadata/resourceController';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import { buildTransientHelperMethods } from './helpers';
import {
	buildTransientDeleteRouteStatements,
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientUnsupportedRouteStatements,
	type BuildTransientRouteBaseOptions,
} from './routes';

export interface BuildTransientStorageArtifactsOptions {
	readonly pascalName: string;
	readonly key: string;
	readonly identity: ResolvedIdentity;
	readonly cacheSegments: readonly unknown[];
	readonly errorCodeFactory: (suffix: string) => string;
}

export interface TransientStorageArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly routeHandlers: RestControllerRouteTransientHandlers;
}

export function buildTransientStorageArtifacts(
	options: BuildTransientStorageArtifactsOptions
): TransientStorageArtifacts {
	const buildBaseOptions = (
		context: Parameters<RestControllerRouteStatementsBuilder>[0]
	): BuildTransientRouteBaseOptions => ({
		pascalName: options.pascalName,
		metadataHost: context.metadataHost,
		cacheSegments: options.cacheSegments,
		identity: options.identity,
		usesIdentity: routeUsesIdentity({
			route: {
				method: context.metadata.method,
				path: context.metadata.path,
			},
			routeKind: context.metadata.kind,
			identity: { param: options.identity.param },
		}),
	});

	const wrap =
		(
			builder: (
				context: BuildTransientRouteBaseOptions
			) => ReturnType<RestControllerRouteStatementsBuilder>
		): RestControllerRouteStatementsBuilder =>
		(context) =>
			builder(buildBaseOptions(context));

	return {
		helperMethods: buildTransientHelperMethods({
			pascalName: options.pascalName,
			key: options.key,
		}),
		routeHandlers: {
			get: wrap(buildTransientGetRouteStatements),
			set: wrap(buildTransientSetRouteStatements),
			delete: wrap(buildTransientDeleteRouteStatements),
			unsupported: (context) =>
				buildTransientUnsupportedRouteStatements({
					...buildBaseOptions(context),
					errorCodeFactory: options.errorCodeFactory,
				}),
		},
	} satisfies TransientStorageArtifacts;
}
