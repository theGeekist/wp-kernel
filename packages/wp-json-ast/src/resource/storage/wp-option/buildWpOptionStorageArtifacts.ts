import type { PhpStmt, PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import type {
	RestControllerRouteOptionHandlers,
	RestControllerRouteStatementsBuilder,
} from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import { buildWpOptionHelperMethods } from './helpers';
import {
	buildWpOptionGetRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
	buildWpOptionUpdateRouteStatements,
} from './routes';

export interface BuildWpOptionStorageArtifactsOptions {
	readonly pascalName: string;
	readonly optionName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

export interface WpOptionStorageArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly routeHandlers: RestControllerRouteOptionHandlers;
}

export function buildWpOptionStorageArtifacts(
	options: BuildWpOptionStorageArtifactsOptions
): WpOptionStorageArtifacts {
	const baseRouteOptions = {
		pascalName: options.pascalName,
		optionName: options.optionName,
	} as const;

	const buildRoute =
		(
			builder: (context: typeof baseRouteOptions) => readonly PhpStmt[]
		): RestControllerRouteStatementsBuilder =>
		() =>
			builder(baseRouteOptions);

	return {
		helperMethods: buildWpOptionHelperMethods(baseRouteOptions),
		routeHandlers: {
			get: buildRoute(() =>
				buildWpOptionGetRouteStatements(baseRouteOptions)
			),
			update: buildRoute(() =>
				buildWpOptionUpdateRouteStatements(baseRouteOptions)
			),
			unsupported: buildRoute(() =>
				buildWpOptionUnsupportedRouteStatements({
					...baseRouteOptions,
					errorCodeFactory: options.errorCodeFactory,
				})
			),
		},
	} satisfies WpOptionStorageArtifacts;
}
