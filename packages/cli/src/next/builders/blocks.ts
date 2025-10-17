import path from 'node:path';
import { generateJSOnlyBlocks } from '../../printers/blocks/js-only';
import { generateSSRBlocks } from '../../printers/blocks/ssr';
import { createHelper } from '../helper';
import type { BuilderHelper, BuilderOutput } from '../runtime/types';

const BLOCKS_TRANSACTION_LABEL = 'builder.generate.blocks.core';
const GENERATED_ROOT = '.generated';
const BLOCKS_ROOT = path.posix.join(GENERATED_ROOT, 'blocks');

interface GeneratedFile {
	readonly path: string;
	readonly content: string;
}

interface BlockGenerationResult {
	readonly files: readonly GeneratedFile[];
	readonly warnings: readonly string[];
}

function toWorkspaceRelative(root: string, filePath: string): string {
	const relative = path
		.relative(root, filePath)
		.split(path.sep)
		.join(path.posix.sep);
	return relative === '' ? '.' : relative;
}

async function queueGeneratedFiles({
	root,
	files,
	output,
	write,
}: {
	readonly root: string;
	readonly files: readonly GeneratedFile[];
	readonly output: BuilderOutput;
	readonly write: (file: string, contents: string) => Promise<void>;
}): Promise<void> {
	for (const file of files) {
		const relative = toWorkspaceRelative(root, file.path);
		await write(relative, file.content);
		output.queueWrite({ file: relative, contents: file.content });
	}
}

function mergeResults(
	results: readonly BlockGenerationResult[]
): BlockGenerationResult {
	const files: GeneratedFile[] = [];
	const warnings: string[] = [];

	for (const result of results) {
		files.push(...result.files);
		warnings.push(...result.warnings);
	}

	return { files, warnings };
}

export function createBlocksBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.blocks.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }) {
			if (input.phase !== 'generate') {
				reporter.debug(
					'createBlocksBuilder: skipping non-generate phase.',
					{ phase: input.phase }
				);
				return;
			}

			if (input.ir.blocks.length === 0) {
				reporter.debug(
					'createBlocksBuilder: no blocks registered in IR.'
				);
				return;
			}

			const projectRoot = path.dirname(input.options.sourcePath);
			const sourceDescription =
				input.ir.meta.origin ?? input.options.origin;

			context.workspace.begin(BLOCKS_TRANSACTION_LABEL);

			try {
				const jsResult = await generateJSOnlyBlocks({
					blocks: input.ir.blocks,
					outputDir: context.workspace.resolve(BLOCKS_ROOT),
					projectRoot,
					source: sourceDescription,
				});

				const ssrResult = await generateSSRBlocks({
					blocks: input.ir.blocks,
					outputDir: context.workspace.resolve(GENERATED_ROOT),
					projectRoot,
					source: sourceDescription,
					phpNamespace: input.ir.php.namespace,
				});

				const combined = mergeResults([jsResult, ssrResult]);

				if (combined.warnings.length > 0) {
					for (const warning of combined.warnings) {
						reporter.warn(warning);
					}
				}

				if (combined.files.length === 0) {
					await context.workspace.rollback(BLOCKS_TRANSACTION_LABEL);
					reporter.debug(
						'createBlocksBuilder: no block artifacts generated.',
						{ warnings: combined.warnings.length }
					);
					return;
				}

				await queueGeneratedFiles({
					root: context.workspace.root,
					files: combined.files,
					output,
					write: async (file, contents) => {
						await context.workspace.write(file, contents);
					},
				});

				const manifest = await context.workspace.commit(
					BLOCKS_TRANSACTION_LABEL
				);

				reporter.debug(
					'createBlocksBuilder: generated block artifacts.',
					{
						files: manifest.writes,
						warnings: combined.warnings.length,
					}
				);
			} catch (error) {
				await context.workspace.rollback(BLOCKS_TRANSACTION_LABEL);
				throw error;
			}
		},
	});
}
