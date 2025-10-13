import { emitPhpArtifacts } from './php/printer';
import { emitTypeDefinitions } from './types/printer';
import { emitUIArtifacts } from './ui/printer';
import { emitBlockArtifacts } from './blocks/index.js';
import type { PrinterContext } from './types';

export type { PrinterContext } from './types';
export type { PhpAstBuilder } from './php/types';

export async function emitGeneratedArtifacts(
	context: PrinterContext
): Promise<void> {
	await emitTypeDefinitions(context);
	await emitPhpArtifacts(context);
	await emitUIArtifacts(context);
	await emitBlockArtifacts(context);
}
