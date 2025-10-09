import type { LoadedKernelConfig } from './types';

/**
 * Load and validate the kernel configuration file.
 *
 * Phase 1 will replace this placeholder with the real implementation that:
 * - Discovers config files via cosmiconfig
 * - Executes TypeScript configs through tsx
 * - Validates against Typanion schemas
 * - Verifies composer autoload mappings
 */
export async function loadKernelConfig(): Promise<LoadedKernelConfig> {
	throw new Error('loadKernelConfig: not implemented yet (Phase 1)');
}
