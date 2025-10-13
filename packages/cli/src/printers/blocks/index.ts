/**
 * Block Printers
 *
 * Generates registration code for WordPress blocks from IR.
 * Handles both JS-only blocks (Phase 3A) and SSR blocks (Phase 3B).
 *
 * @module printers/blocks
 */

import path from 'node:path';
import type { PrinterContext } from '../types.js';
import type { IRBlock } from '../../ir/types.js';
import { deriveResourceBlocks } from './derived-blocks.js';
import type { DerivedBlockManifest } from './derived-blocks.js';
import { generateJSOnlyBlocks } from './js-only.js';
import { generateSSRBlocks } from './ssr.js';
import { reportWarnings, writeGeneratedFiles } from './shared/io.js';

export * from './types.js';
export * from './js-only.js';
export * from './ssr.js';

export async function emitBlockArtifacts(
	context: PrinterContext
): Promise<void> {
	const projectRoot = resolveProjectRoot(context);
	const blocksRoot = path.join(context.outputDir, 'blocks');
	await context.ensureDirectory(blocksRoot);

	const existingBlocks = new Map(
		context.ir.blocks.map((block) => [block.key, block])
	);

	const manualJsOnlyBlocks = context.ir.blocks.filter(
		(block) => !block.hasRender
	);

	const derived = deriveResourceBlocks({
		context,
		projectRoot,
		existingBlocks,
	});

	await writeDerivedManifests(derived.manifests, context);

	const jsOnlyBlocks: IRBlock[] = [];
	const merged = new Map<string, IRBlock>();
	for (const block of [...manualJsOnlyBlocks, ...derived.blocks]) {
		if (!merged.has(block.key)) {
			merged.set(block.key, block);
		}
	}

	jsOnlyBlocks.push(...Array.from(merged.values()).sort(compareBlocks));

	const jsResult = await generateJSOnlyBlocks({
		blocks: jsOnlyBlocks,
		outputDir: blocksRoot,
		projectRoot,
		source: context.ir.meta.origin,
	});

	await writeGeneratedFiles(jsResult, context);
	reportWarnings(jsResult, context);

	const ssrBlocks = context.ir.blocks.filter((block) => block.hasRender);
	const ssrResult = await generateSSRBlocks({
		blocks: ssrBlocks,
		outputDir: context.outputDir,
		projectRoot,
		source: context.ir.meta.origin,
		phpNamespace: context.ir.php.namespace,
	});

	await writeGeneratedFiles(ssrResult, context);
	reportWarnings(ssrResult, context);
}

function compareBlocks(a: IRBlock, b: IRBlock): number {
	return a.key.localeCompare(b.key);
}

function resolveProjectRoot(context: PrinterContext): string {
	if (context.configDirectory) {
		return context.configDirectory;
	}

	const inferredPath = path.resolve(
		process.cwd(),
		context.ir.meta.sourcePath
	);
	return path.dirname(inferredPath);
}

async function writeDerivedManifests(
	manifests: DerivedBlockManifest[],
	context: PrinterContext
): Promise<void> {
	for (const manifest of manifests) {
		await context.ensureDirectory(path.dirname(manifest.manifestPath));
		const contents = `${JSON.stringify(manifest.contents, null, 2)}\n`;
		await context.writeFile(manifest.manifestPath, contents);
	}
}
