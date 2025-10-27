import path from 'node:path';
import {
	appendGeneratedFileDocblock,
	createWpPhpFileBuilder,
} from '@wpkernel/wp-json-ast';
import { buildReturn } from '@wpkernel/php-json-ast';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import type { IRv1 } from '../../../ir/publicTypes';
import type { BlockManifestEntry } from '../../blocks/manifest';
import { sanitizeJson } from '../utils';
import { renderPhpValue } from '../resource/phpValue';

type ManifestEntries = Record<string, BlockManifestEntry>;

export function buildBlocksManifestHelper({
	ir,
	manifestEntries,
}: {
	readonly ir: IRv1;
	readonly manifestEntries: ManifestEntries;
}): BuilderHelper {
	const filePath = path.join(
		path.dirname(ir.php.outputDir),
		'build',
		'blocks-manifest.php'
	);

	return createWpPhpFileBuilder<PipelineContext, BuilderInput, BuilderOutput>(
		{
			key: 'php-blocks-manifest',
			filePath,
			namespace: '',
			metadata: { kind: 'block-manifest' },
			build: (builder) => {
				appendGeneratedFileDocblock(builder, [
					`Source: ${ir.meta.origin} → blocks.ssr.manifest`,
				]);

				const payload = sanitizeJson(manifestEntries);
				builder.appendProgramStatement(
					buildReturn(renderPhpValue(payload))
				);
			},
		}
	);
}
