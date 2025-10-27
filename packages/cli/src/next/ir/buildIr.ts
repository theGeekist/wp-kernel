import type { BuildIrOptions, IRv1 } from './publicTypes';
import { createIr } from './createIr';

export async function buildIr(options: BuildIrOptions): Promise<IRv1> {
	return createIr(options, { phase: 'init' });
}
