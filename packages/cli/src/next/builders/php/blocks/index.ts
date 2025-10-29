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
import { buildBlockModule } from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from '../channel';

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

			await stageRenderStubs({
				stubs: blockModule.renderStubs,
				workspace: context.workspace,
				output,
				reporter,
			});

			const channel = getPhpBuilderChannel(context);
			for (const file of blockModule.files) {
				const target = resolveBlockFilePath({
					file,
					ir,
				});

				channel.queue({
					file: target,
					program: file.program,
					metadata: file.metadata,
					docblock: file.docblock,
					uses: [],
					statements: [],
				});
			}

			reporter.debug(
				'createPhpBlocksHelper: queued SSR block manifest and registrar.'
			);

			await next?.();
		},
	});
}

function resolveBlockFilePath({
	file,
	ir,
}: {
	readonly file: ReturnType<typeof buildBlockModule>['files'][number];
	readonly ir: BuilderApplyOptions['input']['ir'];
}): string {
	if (file.metadata.kind === 'block-manifest') {
		const manifestDir = path.dirname(ir!.php.outputDir);
		return path.join(manifestDir, file.fileName);
	}

	return path.join(ir!.php.outputDir, file.fileName);
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
