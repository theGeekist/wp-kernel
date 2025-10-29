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
	buildIndexProgram,
	createWpPhpFileBuilder,
	type ModuleIndexEntry,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../ir/publicTypes';
import { toPascalCase } from './utils';

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

			const moduleNamespace = `${ir.php.namespace}\\Generated`;
			const program = buildIndexProgram({
				origin: ir.meta.origin,
				namespace: moduleNamespace,
				entries: buildIndexEntries(ir),
			});

			const helper = createWpPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'php-index',
				filePath: options.context.workspace.resolve(
					ir.php.outputDir,
					'index.php'
				),
				namespace: program.namespace ?? moduleNamespace,
				metadata: program.metadata,
				build: (builder) => {
					appendGeneratedFileDocblock(builder, program.docblock);

					for (const statement of program.statements) {
						builder.appendProgramStatement(statement);
					}
				},
			});

			await helper.apply(options);
			await next?.();
		},
	});
}

function buildIndexEntries(ir: IRv1): ModuleIndexEntry[] {
	const namespace = `${ir.php.namespace}\\Generated`;
	const entries: ModuleIndexEntry[] = [
		{
			className: `${namespace}\\Rest\\BaseController`,
			path: 'Rest/BaseController.php',
		},
		{
			className: `${namespace}\\Capability\\Capability`,
			path: 'Capability/Capability.php',
		},
		{
			className: `${namespace}\\Registration\\PersistenceRegistry`,
			path: 'Registration/PersistenceRegistry.php',
		},
	];

	for (const resource of ir.resources) {
		const pascal = toPascalCase(resource.name);
		entries.push({
			className: `${namespace}\\Rest\\${pascal}Controller`,
			path: `Rest/${pascal}Controller.php`,
		});
	}

	return entries;
}
