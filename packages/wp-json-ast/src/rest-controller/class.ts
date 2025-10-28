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

export function buildRestControllerClass(
	config: RestControllerClassConfig
): RestControllerClassBuildResult {
	const methods: PhpStmtClassMethod[] = [
		buildGetResourceNameMethod(config.resourceName),
		buildGetSchemaKeyMethod(config.schemaKey),
		buildGetRestArgsMethod(config.restArgsExpression),
	];

	for (const route of config.routes) {
		methods.push(buildRestRoute(route));
	}

	if (config.helperMethods) {
		methods.push(...config.helperMethods);
	}

	const classNode: PhpStmtClass = buildClass(
		buildIdentifier(config.className),
		{
			flags: PHP_CLASS_MODIFIER_FINAL,
			extends: buildName(['BaseController']),
			stmts: methods,
		}
	);

	const uses = new Set<string>([
		'WP_Error',
		'WP_REST_Request',
		'function is_wp_error',
	]);

	if (config.routes.some((route) => route.policy) && config.policyClass) {
		uses.add(config.policyClass);
	}

	for (const entry of config.additionalUses ?? []) {
		uses.add(entry);
	}

	return {
		classNode,
		uses: [...uses],
	};
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
