import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendGeneratedFileDocblock,
	buildClass,
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	buildScalarString,
	createPhpFileBuilder,
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast';

export function createPhpBaseControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.base',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			if (options.input.phase !== 'generate' || !options.input.ir) {
				await next?.();
				return;
			}

			const { ir } = options.input;
			const namespaceRoot = ir.php.namespace;
			const namespace = `${namespaceRoot}\\Rest`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Rest',
				'BaseController.php'
			);

			const builderHelper = createPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'base-controller',
				filePath,
				namespace,
				metadata: { kind: 'base-controller' },
				build: (builder) => {
					buildBaseController(
						builder,
						ir.meta.origin,
						ir.meta.sanitizedNamespace
					);
				},
			});

			await builderHelper.apply(options);
			await next?.();
		},
	});
}

function buildBaseController(
	builder: PhpAstBuilderAdapter,
	origin: string,
	sanitizedNamespace: string
): void {
	appendGeneratedFileDocblock(builder, [
		`Source: ${origin} → resources (namespace: ${sanitizedNamespace})`,
	]);

	const getNamespaceMethod = buildClassMethod(
		buildIdentifier('get_namespace'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(sanitizedNamespace))],
		}
	);

	const classNode = buildClass(buildIdentifier('BaseController'), {
		flags: PHP_CLASS_MODIFIER_ABSTRACT,
		stmts: [getNamespaceMethod],
	});

	builder.appendProgramStatement(classNode);
}
