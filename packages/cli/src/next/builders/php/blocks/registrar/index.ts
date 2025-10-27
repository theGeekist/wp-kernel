import path from 'node:path';
import {
	appendGeneratedFileDocblock,
	createWpPhpFileBuilder,
} from '@wpkernel/wp-json-ast';
import {
	buildClass,
	buildIdentifier,
	PHP_CLASS_MODIFIER_FINAL,
	type PhpAstBuilderAdapter,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../../runtime/types';
import type { IRv1 } from '../../../../ir/publicTypes';
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

export function buildBlocksRegistrarHelper({
	ir,
}: {
	readonly ir: IRv1;
}): BuilderHelper {
	const filePath = path.join(ir.php.outputDir, 'Blocks', 'Register.php');

	return createWpPhpFileBuilder<PipelineContext, BuilderInput, BuilderOutput>(
		{
			key: 'php-blocks-registrar',
			filePath,
			namespace: `${ir.php.namespace}\\Blocks`,
			metadata: { kind: 'block-registrar' },
			build: (builder) => buildRegistrarClass(builder, ir),
		}
	);
}

function buildRegistrarClass(builder: PhpAstBuilderAdapter, ir: IRv1): void {
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → blocks.ssr.register`,
	]);

	builder.addUse('function register_block_type_from_metadata');

	const methods: PhpStmtClassMethod[] = [
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

	builder.appendProgramStatement(classNode);
}
