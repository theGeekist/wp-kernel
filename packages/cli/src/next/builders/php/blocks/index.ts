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
import { buildBlocksManifestHelper } from './manifestHelper';
import { buildBlocksRegistrarHelper } from './registrar';
import { stageRenderStubs } from './renderStubs';

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

			await stageRenderStubs({
				stubs: renderStubs,
				workspace: context.workspace,
				output,
				reporter,
			});

			if (Object.keys(manifestEntries).length === 0) {
				reporter.debug(
					'createPhpBlocksHelper: no manifest entries produced.'
				);
				await next?.();
				return;
			}

			const manifestHelper = buildBlocksManifestHelper({
				ir,
				manifestEntries,
			});
			const registrarHelper = buildBlocksRegistrarHelper({ ir });

			await manifestHelper.apply(options);
			await registrarHelper.apply(options);

			reporter.debug(
				'createPhpBlocksHelper: queued SSR block manifest and registrar.'
			);

			await next?.();
		},
	});
}
