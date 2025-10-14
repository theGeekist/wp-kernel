import path from 'node:path';

import type { PrinterContext } from '../../types.js';
import type { BlockPrinterResult } from '../types.js';

export async function writeGeneratedFiles(
	result: BlockPrinterResult,
	context: PrinterContext
): Promise<void> {
	for (const file of result.files) {
		await context.ensureDirectory(path.dirname(file.path));
		let formatted = file.content;
		if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
			formatted = await context.formatTs(file.path, file.content);
		} else if (file.path.endsWith('.php')) {
			formatted = await context.formatPhp(file.path, file.content);
		}
		await context.writeFile(file.path, formatted);
	}
}

export function reportWarnings(
	result: BlockPrinterResult,
	context: PrinterContext
): void {
	if (result.warnings.length === 0) {
		return;
	}

	const reporter = context.adapterContext?.reporter;
	if (!reporter) {
		return;
	}

	for (const warning of result.warnings) {
		reporter.warn?.(warning);
	}
}
