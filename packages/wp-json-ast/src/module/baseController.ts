import {
	buildClass,
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	buildScalarString,
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '@wpkernel/php-json-ast';

import { buildRestBaseControllerDocblock } from '../common/docblock';
import { deriveModuleNamespace } from '../common/module';
import type {
	BaseControllerProgram,
	BaseControllerProgramConfig,
} from './types';

const DEFAULT_CLASS_NAME = 'BaseController';
const DEFAULT_METHOD_NAME = 'get_namespace';

/**
 * @param    config
 * @category WordPress AST
 */
export function buildBaseControllerProgram(
	config: BaseControllerProgramConfig
): BaseControllerProgram {
	const namespacePlan = deriveModuleNamespace(config.namespace);
	const docblock = buildRestBaseControllerDocblock({
		origin: config.origin,
		sanitizedNamespace: namespacePlan.sanitizedNamespace,
	});

	const classNode = buildClass(buildIdentifier(DEFAULT_CLASS_NAME), {
		flags: PHP_CLASS_MODIFIER_ABSTRACT,
		stmts: [
			buildClassMethod(buildIdentifier(DEFAULT_METHOD_NAME), {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: buildIdentifier('string'),
				stmts: [
					buildReturn(
						buildScalarString(namespacePlan.sanitizedNamespace)
					),
				],
			}),
		],
	});

	return {
		namespace: namespacePlan.namespace,
		docblock,
		metadata:
			config.metadataName === undefined
				? { kind: 'base-controller' }
				: {
						kind: 'base-controller',
						name: config.metadataName,
					},
		statements: [classNode],
	} satisfies BaseControllerProgram;
}
