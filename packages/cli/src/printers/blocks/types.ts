/**
 * Block Printer Types
 *
 * Shared type definitions for block registration code generation.
 *
 * @module printers/blocks/types
 */

import type { IRBlock } from '../../ir/types.js';

/**
 * Options for generating block registration code
 */
export interface BlockPrinterOptions {
	/**
	 * Blocks from IR to process
	 */
	blocks: IRBlock[];

	/**
	 * Output directory for generated files
	 */
	outputDir: string;

	/**
	 * Project root directory
	 */
	projectRoot: string;

	/**
	 * Source description used in generated banners
	 */
	source?: string;
}

/**
 * Result of block printer operation
 */
export interface BlockPrinterResult {
	/**
	 * Generated files with paths and content
	 */
	files: Array<{
		path: string;
		content: string;
	}>;

	/**
	 * Warnings encountered during generation
	 */
	warnings: string[];
}

/**
 * Options for JS-only block registration
 */
export interface JSOnlyBlockOptions extends BlockPrinterOptions {
	/**
	 * Whether to include source maps
	 * @default false
	 */
	sourceMaps?: boolean;
}

/**
 * Options for SSR block manifest generation
 */
export interface SSRBlockOptions extends BlockPrinterOptions {
	/**
	 * PHP namespace for registrar class
	 * @default derived from project namespace
	 */
	phpNamespace?: string;

	/**
	 * Whether to include block.json validation
	 * @default true
	 */
	validateManifest?: boolean;
}
