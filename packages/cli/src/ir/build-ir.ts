import type { BuildIrOptions, IRv1 } from './types';

/**
 * Construct the intermediate representation used by printers.
 *
 * The real implementation (Phase 2) will:
 * - Canonicalise namespaces and paths
 * - Load schemas and compute SHA-256 hashes
 * - Detect duplicate/unsafe routes
 * - Derive policy hints
 * - Populate adapter metadata
 * @param _options
 */
export async function buildIr(_options: BuildIrOptions): Promise<IRv1> | never {
	throw new Error('buildIr: not implemented yet (Phase 2)');
}
