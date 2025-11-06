import {
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import { createFallbackExpr, createCapabilityMapExpr } from './helpers';
import type { CapabilityDefinition, CapabilityFallback } from './types';

/**
 * @param    definitions
 * @category WordPress AST
 */
export function buildCapabilityMapMethod(
	definitions: readonly CapabilityDefinition[]
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('capability_map'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(createCapabilityMapExpr(definitions))],
	});
}

/**
 * @param    fallback
 * @category WordPress AST
 */
export function buildFallbackMethod(
	fallback: CapabilityFallback
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('fallback'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(createFallbackExpr(fallback))],
	});
}
