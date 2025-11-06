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

/**
 * @category WordPress AST
 */
export interface BuildWpOptionStorageArtifactsOptions {
	readonly pascalName: string;
	readonly optionName: string;
	readonly errorCodeFactory: (suffix: string) => string;
}

interface WpOptionRouteBaseOptions {
	readonly pascalName: string;
	readonly optionName: string;
}

type WpOptionRouteStatementsBuilder = (
	options: WpOptionRouteBaseOptions
) => readonly PhpStmt[];

/**
 * @category WordPress AST
 */
export interface WpOptionStorageArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly routeHandlers: RestControllerRouteOptionHandlers;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildWpOptionStorageArtifacts(
	options: BuildWpOptionStorageArtifactsOptions
): WpOptionStorageArtifacts {
	const baseRouteOptions: WpOptionRouteBaseOptions = {
		pascalName: options.pascalName,
		optionName: options.optionName,
	};

	const createRouteHandler =
		(
			builder: WpOptionRouteStatementsBuilder
		): RestControllerRouteStatementsBuilder =>
		() =>
			builder(baseRouteOptions);

	return {
		helperMethods: buildWpOptionHelperMethods(baseRouteOptions),
		routeHandlers: {
			get: createRouteHandler((context) =>
				buildWpOptionGetRouteStatements(context)
			),
			update: createRouteHandler((context) =>
				buildWpOptionUpdateRouteStatements(context)
			),
			unsupported: createRouteHandler((context) =>
				buildWpOptionUnsupportedRouteStatements({
					...context,
					errorCodeFactory: options.errorCodeFactory,
				})
			),
		},
	} satisfies WpOptionStorageArtifacts;
}
