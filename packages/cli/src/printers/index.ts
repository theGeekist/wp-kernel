import { emitPhpArtifacts } from './php/printer';
import { emitTypeDefinitions } from './types/printer';
import { emitUIArtifacts } from './ui/printer';
import type { PrinterContext } from './types';

export type { PrinterContext } from './types';
export type { PhpAstBuilder } from './php/types';

export async function emitGeneratedArtifacts(
	context: PrinterContext
): Promise<void> {
	await emitTypeDefinitions(context);
	await emitUIArtifacts(context);
	await emitPhpArtifacts(context);
}
