import {
	buildClass,
	buildIdentifier,
	PHP_CLASS_MODIFIER_FINAL,
	type PhpStmtClass,
} from '@wpkernel/php-json-ast';

import type { PolicyMapConfig } from './types';
import { buildCallbackMethod } from './callback';
import { buildEnforceMethod } from './enforce';
import { buildFallbackMethod, buildPolicyMapMethod } from './map';
import {
	buildCreateErrorMethod,
	buildGetBindingMethod,
	buildGetDefinitionMethod,
} from './lookup';

interface BuildPolicyClassOptions {
	readonly policyMap: PolicyMapConfig;
}

export function buildPolicyClass(
	options: BuildPolicyClassOptions
): PhpStmtClass {
	const { policyMap } = options;
	const methods = [
		buildPolicyMapMethod(policyMap.definitions),
		buildFallbackMethod(policyMap.fallback),
		buildCallbackMethod(),
		buildEnforceMethod(),
		buildGetDefinitionMethod(),
		buildGetBindingMethod(),
		buildCreateErrorMethod(),
	];

	return buildClass(buildIdentifier('Policy'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});
}
