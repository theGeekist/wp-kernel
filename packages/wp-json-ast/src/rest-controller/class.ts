import {
	buildClass,
	buildClassMethod,
	buildIdentifier,
	buildName,
	buildReturn,
	buildScalarString,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpExpr,
	type PhpStmtClassMethod,
	type PhpStmtClass,
} from '@wpkernel/php-json-ast';

import type {
	RestControllerClassBuildResult,
	RestControllerClassConfig,
} from './types';
import { buildRestRoute } from './route';
import { deriveRestControllerImports } from './imports';

/**
 * @param    config
 * @category WordPress AST
 */
export function buildRestControllerClass(
	config: RestControllerClassConfig
): RestControllerClassBuildResult {
	const methods = buildControllerMethods(config);

	const classNode: PhpStmtClass = buildClass(
		buildIdentifier(config.className),
		{
			flags: PHP_CLASS_MODIFIER_FINAL,
			extends: buildName(['BaseController']),
			stmts: methods,
		}
	);

	const imports = deriveRestControllerImports(config.routes, {
		capabilityClass: config.capabilityClass,
		helperMethods: config.helperMethods,
	});

	return {
		classNode,
		uses: [...imports],
	};
}

function buildControllerMethods(
	config: RestControllerClassConfig
): PhpStmtClassMethod[] {
	const routeMethods = config.routes.map((route) =>
		buildRestRoute({
			route,
			identity: config.identity,
		})
	);

	return [
		buildGetResourceNameMethod(config.resourceName),
		buildGetSchemaKeyMethod(config.schemaKey),
		buildGetRestArgsMethod(config.restArgsExpression),
		...routeMethods,
		...Array.from(config.helperMethods ?? []),
	];
}

function buildGetResourceNameMethod(resourceName: string): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_resource_name'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturnScalar(resourceName)],
	});
}

function buildGetSchemaKeyMethod(schemaKey: string): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_schema_key'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturnScalar(schemaKey)],
	});
}

function buildGetRestArgsMethod(expression: PhpExpr): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_rest_args'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(expression)],
	});
}

function buildReturnScalar(value: string) {
	return buildReturn(buildScalarString(value));
}
