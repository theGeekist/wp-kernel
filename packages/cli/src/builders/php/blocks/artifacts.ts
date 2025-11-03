import type { BuilderApplyOptions } from '../../../runtime/types';
import type {
	BlockManifestEntry,
	ProcessedBlockManifest,
} from '../../blocks/manifest';

export interface CollatePhpBlockArtifactsOptions {
	readonly processedBlocks: readonly ProcessedBlockManifest[];
	readonly reporter: BuilderApplyOptions['reporter'];
}

export interface CollatedPhpBlockArtifacts {
	readonly manifestEntries: Record<string, BlockManifestEntry>;
	readonly renderStubs: readonly NonNullable<
		ProcessedBlockManifest['renderStub']
	>[];
}

export function collatePhpBlockArtifacts({
	processedBlocks,
	reporter,
}: CollatePhpBlockArtifactsOptions): CollatedPhpBlockArtifacts {
	const manifestEntries: Record<string, BlockManifestEntry> = {};
	const renderStubs: NonNullable<ProcessedBlockManifest['renderStub']>[] = [];

	for (const processed of processedBlocks) {
		for (const warning of processed.warnings) {
			reporter.warn(warning);
		}

		if (processed.manifestEntry) {
			manifestEntries[processed.block.key] = processed.manifestEntry;
		}

		if (processed.renderStub) {
			renderStubs.push(processed.renderStub);
		}
	}

	return { manifestEntries, renderStubs };
}
