/**
 * JS-Only Block Printer (Phase 3A)
 *
 * Generates TypeScript registration code for blocks without server-side rendering.
 * Produces `src/blocks/auto-register.ts` with `registerBlockType()` calls.
 *
 * @module printers/blocks/js-only
 */

import type { JSOnlyBlockOptions, BlockPrinterResult } from './types.js';

/**
 * Generate registration code for JS-only blocks.
 *
 * Creates a TypeScript file that imports block.json files and registers them
 * with WordPress using `registerBlockType()`.
 *
 * @param _options - Configuration for JS-only block generation
 * @return Generated files and warnings
 * @example
 * ```ts
 * const result = await generateJSOnlyBlocks({
 *   blocks: ir.blocks.filter(b => !b.ssr),
 *   outputDir: 'src/blocks',
 *   projectRoot: process.cwd()
 * });
 * ```
 * @internal
 */
export async function generateJSOnlyBlocks(
	_options: JSOnlyBlockOptions
): Promise<BlockPrinterResult> {
	// TODO: Phase 3A implementation
	// 1. Filter blocks where ssr === false
	// 2. Generate import statements for block.json files
	// 3. Generate registerBlockType() calls
	// 4. Format with existing TS formatter
	// 5. Write to src/blocks/auto-register.ts

	return {
		files: [],
		warnings: ['Phase 3A: JS-only block printer not yet implemented'],
	};
}
