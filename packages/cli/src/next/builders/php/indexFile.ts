import { createHelper } from '@wpkernel/core/pipeline';
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
	createPhpFileBuilder,
	createPhpReturn,
	toPascalCase,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast';
import type { IRv1 } from '../../../ir/types';

export function createPhpIndexFileHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.index',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;

			const helper = createPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'php-index',
				filePath: options.context.workspace.resolve(
					ir.php.outputDir,
					'index.php'
				),
				namespace: ir.php.namespace,
				metadata: { kind: 'index-file' },
				build: (builder) => buildIndexFile(builder, ir),
			});

			await helper.apply(options);
			await next?.();
		},
	});
}

function buildIndexFile(builder: PhpAstBuilderAdapter, ir: IRv1): void {
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → php/index`,
	]);

	const entries = createIndexEntries(ir);
	const printable = createPhpReturn(entries, 1);
	printable.lines.forEach((line) => builder.appendStatement(line));
	builder.appendProgramStatement(printable.node);
}

function createIndexEntries(ir: IRv1): Record<string, string> {
	const namespace = ir.php.namespace;
	const baseDir = ir.php.outputDir;

	const entries: Record<string, string> = {
		[`${namespace}\\Rest\\BaseController`]: `${baseDir}/Rest/BaseController.php`,
		[`${namespace}\\Policy\\Policy`]: `${baseDir}/Policy/Policy.php`,
		[`${namespace}\\Registration\\PersistenceRegistry`]: `${baseDir}/Registration/PersistenceRegistry.php`,
	};

	for (const resource of ir.resources) {
		const pascal = toPascalCase(resource.name);
		const className = `${namespace}\\Rest\\${pascal}Controller`;
		entries[className] = `${baseDir}/Rest/${pascal}Controller.php`;
	}

	return entries;
}
