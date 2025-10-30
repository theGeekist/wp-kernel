import path from 'node:path';
import { createHelper } from '../../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../../runtime/types';
import {
	collectBlockManifests,
	type ProcessedBlockManifest,
} from '../../blocks/manifest';
import { collatePhpBlockArtifacts } from './artifacts';
import { stageRenderStubs } from './renderStubs';
import {
	buildBlockModule,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	type ProgramTargetPlannerOptions,
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from '../channel';

type BlockModuleQueuedFile = ReturnType<
	typeof buildBlockModule
>['files'][number];
type PlannerWorkspace = ProgramTargetPlannerOptions['workspace'];

export function createPhpBlocksHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.blocks',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;
			const blocks = ir.blocks.filter((block) => block.hasRender);
			if (blocks.length === 0) {
				reporter.debug(
					'createPhpBlocksHelper: no SSR blocks discovered.'
				);
				await next?.();
				return;
			}

			const processedMap = await collectBlockManifests({
				workspace: context.workspace,
				blocks,
			});

			const processedBlocks = blocks
				.map((block) => processedMap.get(block.key))
				.filter((entry): entry is ProcessedBlockManifest =>
					Boolean(entry)
				);

			const { manifestEntries, renderStubs } = collatePhpBlockArtifacts({
				processedBlocks,
				reporter,
			});

			if (Object.keys(manifestEntries).length === 0) {
				reporter.debug(
					'createPhpBlocksHelper: no manifest entries produced.'
				);
				await next?.();
				return;
			}

			const blockModule = buildBlockModule({
				origin: ir.meta.origin,
				namespace: `${ir.php.namespace}\\Blocks`,
				manifest: {
					fileName: 'build/blocks-manifest.php',
					entries: manifestEntries,
				},
				registrarFileName: 'Blocks/Register.php',
				renderStubs,
			});

			reportManifestValidationErrors({
				files: blockModule.files,
				reporter,
			});

			const planner = buildProgramTargetPlanner({
				workspace: context.workspace,
				outputDir: ir.php.outputDir,
				channel: getPhpBuilderChannel(context),
				docblockPrefix: DEFAULT_DOC_HEADER,
				strategy: {
					resolveFilePath: ({ workspace, outputDir, file }) =>
						resolveBlockFilePath({
							workspace,
							outputDir,
							file: file as BlockModuleQueuedFile,
						}),
				},
			});

			await stageRenderStubs({
				stubs: blockModule.renderStubs,
				workspace: context.workspace,
				output,
				reporter,
			});

			planner.queueFiles({ files: blockModule.files });

			reporter.debug(
				'createPhpBlocksHelper: queued SSR block manifest and registrar.'
			);

			await next?.();
		},
	});
}

function resolveBlockFilePath({
	workspace,
	outputDir,
	file,
}: {
	readonly workspace: PlannerWorkspace;
	readonly outputDir: string;
	readonly file: BlockModuleQueuedFile;
}): string {
	const normalisedSegments = file.fileName
		.replace(/\\/g, '/')
		.split('/')
		.filter(Boolean);

	if (file.metadata.kind === 'block-manifest') {
		const manifestDir = path.dirname(outputDir);
		return workspace.resolve(manifestDir, ...normalisedSegments);
	}

	return workspace.resolve(outputDir, ...normalisedSegments);
}

function reportManifestValidationErrors({
	files,
	reporter,
}: {
	readonly files: ReturnType<typeof buildBlockModule>['files'];
	readonly reporter: BuilderApplyOptions['reporter'];
}): void {
	const manifestFile = files.find(
		(file) => file.metadata.kind === 'block-manifest'
	);
	if (!manifestFile || manifestFile.metadata.kind !== 'block-manifest') {
		return;
	}

	for (const error of manifestFile.metadata.validation?.errors ?? []) {
		reporter.error(error.message, {
			code: error.code,
			block: error.block,
			field: error.field,
			value: error.value,
		});
	}
}
