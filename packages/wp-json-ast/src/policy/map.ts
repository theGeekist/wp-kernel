import {
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import { createFallbackExpr, createPolicyMapExpr } from './helpers';
import type { PolicyDefinition, PolicyFallback } from './types';

export function buildPolicyMapMethod(
	definitions: readonly PolicyDefinition[]
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('policy_map'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(createPolicyMapExpr(definitions))],
	});
}

export function buildFallbackMethod(
	fallback: PolicyFallback
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('fallback'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(createFallbackExpr(fallback))],
	});
}
