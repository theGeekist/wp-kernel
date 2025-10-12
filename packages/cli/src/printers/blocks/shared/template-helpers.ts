/**
 * Shared Block Printer Helpers
 *
 * Common utilities for block registration code generation.
 * Shared between JS-only and SSR block printers.
 *
 * @module printers/blocks/shared/template-helpers
 */

import type { IRBlock } from '../../../ir/types.js';

/**
 * Generate relative import path from output file to block.json.
 *
 * @param _blockPath  - Absolute path to block directory
 * @param _outputPath - Absolute path to output file
 * @return Relative import path
 * @internal
 */
export function generateBlockImportPath(
	_blockPath: string,
	_outputPath: string
): string {
	// TODO: Implement relative path calculation
	return '';
}
/**
 * Format block name for use in variable names.
 *
 * Converts 'my-plugin/my-block' to 'myPluginMyBlock'.
 *
 * @param blockName - Block name from block.json
 * @return Camel-cased identifier
 *
 * @internal
 */
export function formatBlockVariableName(blockName: string): string {
	// TODO: Implement name formatting
	return blockName.replace(/[/-]/g, '');
}

/**
 * Validate block.json structure.
 *
 * @param _block - Block from IR
 * @return Validation errors, empty if valid
 * @internal
 */
export function validateBlockManifest(_block: IRBlock): string[] {
	// TODO: Implement validation
	// Check required fields: name, title, category, icon
	// Warn on missing editorScript/viewScript
	return [];
}
