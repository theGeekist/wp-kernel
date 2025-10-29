import {
	buildDeclare,
	buildDeclareItem,
	buildName,
	buildNamespace,
	buildStmtNop,
	buildUse,
	buildUseUse,
	buildComment,
	buildScalarInt,
	buildClass,
	buildIdentifier,
	mergeNodeAttributes,
	type PhpProgram,
	type PhpStmt,
	PHP_CLASS_MODIFIER_FINAL,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../../constants';
import {
	buildGeneratedFileDocComment,
	buildBlockRegistrarDocblock,
} from '../../common/docblock';
import { buildBlockRegistrarMetadata } from '../../common/metadata/block';
import { buildRegisterMethod } from './methods/register';
import {
	buildNormaliseRelativeMethod,
	buildResolveConfigPathMethod,
	buildResolveDirectoryFallbackMethod,
	buildResolveRenderPathMethod,
} from './methods/paths';
import {
	buildBuildRenderArgumentsMethod,
	buildRenderTemplateMethod,
} from './methods/render';
import type { BlockModuleFile } from '../types';

const DEFAULT_REGISTRAR_FILE = 'Blocks/Register.php';

export function buildBlockRegistrarFile(
	origin: string,
	namespace: string,
	fileName: string = DEFAULT_REGISTRAR_FILE
): BlockModuleFile<ReturnType<typeof buildBlockRegistrarMetadata>> {
	const docblock = buildBlockRegistrarDocblock({ origin });
	const metadata = buildBlockRegistrarMetadata();

	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const methods = [
		buildRegisterMethod(),
		buildResolveConfigPathMethod(),
		buildResolveRenderPathMethod(),
		buildBuildRenderArgumentsMethod(),
		buildRenderTemplateMethod(),
		buildResolveDirectoryFallbackMethod(),
		buildNormaliseRelativeMethod(),
	];

	const classNode = buildClass(buildIdentifier('Register'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});

	const namespaceNode = mergeNodeAttributes(
		buildNamespace(buildName(splitNamespace(namespace)), [
			buildUse(2, [
				buildUseUse(buildName(['register_block_type_from_metadata'])),
			]),
			...buildGuardedBlock([classNode]),
		]),
		{ comments: [buildGeneratedFileDocComment(docblock)] }
	);

	const program: PhpProgram = [strictTypes, namespaceNode];

	return {
		fileName,
		namespace,
		docblock,
		metadata,
		program,
	} satisfies BlockModuleFile<typeof metadata>;
}

function buildGuardedBlock(statements: readonly PhpStmt[]): readonly PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];
}

function splitNamespace(namespace: string): string[] {
	return namespace.length > 0 ? namespace.split('\\') : [];
}
