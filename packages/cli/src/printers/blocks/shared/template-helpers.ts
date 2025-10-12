/**
 * Shared Block Printer Helpers
 *
 * Common utilities for block registration code generation.
 * Shared between JS-only and SSR block printers.
 *
 * @module printers/blocks/shared/template-helpers
 */

import path from 'node:path';
import type { IRBlock } from '../../../ir/types.js';

/**
 * Generate relative import path from output file to block.json.
 *
 * @param blockPath  - Absolute path to block directory
 * @param outputPath - Absolute path to output file
 * @return Relative import path
 * @internal
 */
export function generateBlockImportPath(
	blockPath: string,
	outputPath: string
): string {
	const relativePath = path.relative(path.dirname(outputPath), blockPath);
	const normalized = relativePath.split(path.sep).join('/');

	if (!normalized.startsWith('.')) {
		return `./${normalized}`;
	}

	return normalized;
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
	const segments = blockName
		.split(/[\/\-]/u)
		.filter(Boolean)
		.map((segment) => segment.trim());

	if (segments.length === 0) {
		return 'block';
	}

	return segments
		.map((segment, index) => {
			const lower = segment.toLowerCase();
			if (index === 0) {
				return lower;
			}

			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join('');
}

/**
 * Validate block.json structure.
 *
 * @param manifest
 * @param block    - Block from IR
 * @return Validation errors, empty if valid
 * @internal
 */
export function validateBlockManifest(
	manifest: unknown,
	block: IRBlock
): string[] {
	if (!manifest || typeof manifest !== 'object') {
		return [`Block manifest for "${block.key}" is not a valid object.`];
	}

	const data = manifest as Record<string, unknown>;
	const warnings: string[] = [];

	const checks: Array<{ condition: boolean; message: string }> = [
		{
			condition: isNonEmptyString(data.name),
			message: `Block manifest for "${block.key}" is missing a "name" field.`,
		},
		{
			condition: isNonEmptyString(data.title),
			message: `Block manifest for "${block.key}" is missing a "title" field.`,
		},
		{
			condition: isNonEmptyString(data.category),
			message: `Block manifest for "${block.key}" is missing a "category" field.`,
		},
		{
			condition: isNonEmptyString(data.icon),
			message: `Block manifest for "${block.key}" does not define an "icon".`,
		},
		{
			condition:
				hasString(data.editorScript) ||
				hasString(data.editorScriptModule),
			message: `Block manifest for "${block.key}" is missing "editorScript" or "editorScriptModule".`,
		},
	];

	for (const check of checks) {
		if (!check.condition) {
			warnings.push(check.message);
		}
	}

	if (
		!block.hasRender &&
		!(hasString(data.viewScript) || hasString(data.viewScriptModule))
	) {
		warnings.push(
			`JS-only block "${block.key}" is missing "viewScript" or "viewScriptModule".`
		);
	}

	return warnings;
}

function isNonEmptyString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.trim().length > 0;
}

function hasString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.length > 0;
}
