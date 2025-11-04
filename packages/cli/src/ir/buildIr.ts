import type { BuildIrOptions, IRv1 } from './publicTypes';
import { createIr } from './createIr';

/**
 * Builds the Intermediate Representation (IR) for a WP Kernel project.
 *
 * This function orchestrates the process of collecting, validating, and transforming
 * project configurations and metadata into a structured IR that serves as a single
 * source of truth for code generation and other CLI operations.
 *
 * @category IR
 * @param    options - Options for building the IR, including the project configuration and source details.
 * @returns A promise that resolves with the generated `IRv1` object.
 */
export async function buildIr(options: BuildIrOptions): Promise<IRv1> {
	return createIr(options, { phase: 'init' });
}
