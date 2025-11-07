import type { BuilderApplyOptions } from '../../../runtime/types';
import type {
	BlockManifestEntry,
	ProcessedBlockManifest,
} from '../../blocks/manifest';

/**
 * Options for collating PHP block artifacts during build.
 *
 * @category AST Builders
 */
export interface CollatePhpBlockArtifactsOptions {
	readonly processedBlocks: readonly ProcessedBlockManifest[];
	readonly reporter: BuilderApplyOptions['reporter'];
}

/**
 * Collated WordPress block artifacts for PHP generation.
 *
 * Contains block manifest entries and PHP render callback stubs extracted
 * from processed block definitions.
 *
 * @category AST Builders
 */
export interface CollatedPhpBlockArtifacts {
	readonly manifestEntries: Record<string, BlockManifestEntry>;
	readonly renderStubs: readonly NonNullable<
		ProcessedBlockManifest['renderStub']
	>[];
}

/**
 * Collates block manifest entries and PHP render stubs from processed blocks.
 *
 * Aggregates block metadata and server-side render callbacks, reporting any
 * warnings encountered during block processing. Used to prepare artifacts for
 * PHP plugin generation.
 *
 * @param    options                 - Processed blocks and reporter for warnings
 * @param    options.processedBlocks - Array of processed block definitions
 * @param    options.reporter        - Reporter instance for warnings
 * @returns Collated artifacts with manifest entries and render stubs
 * @category AST Builders
 */
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
