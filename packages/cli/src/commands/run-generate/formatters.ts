import fs from 'node:fs/promises';
import type { PrinterContext } from '../../printers';
import { ensurePrettierLoaded } from './prettier';

export async function formatTs(
	contents: string,
	filePath: string
): Promise<string> {
	const { prettier } = await ensurePrettierLoaded();
	const formatted = await prettier.format(contents, { filepath: filePath });
	return ensureTrailingNewline(formatted);
}

export async function formatPhp(
	contents: string,
	filePath: string
): Promise<string> {
	const { prettier, phpPlugin } = await ensurePrettierLoaded();
	const formatted = await prettier.format(contents, {
		filepath: filePath,
		parser: 'php',
		plugins: [phpPlugin],
	});
	return ensureTrailingNewline(formatted);
}

export function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}

export function createEnsureDirectory(
	dryRun: boolean
): PrinterContext['ensureDirectory'] {
	if (dryRun) {
		return async () => undefined;
	}

	return async (directoryPath: string) => {
		await fs.mkdir(directoryPath, { recursive: true });
	};
}
