import { configureKernel } from '@wpkernel/core/data';
import type { KernelInstance } from '@wpkernel/core/data';
import { wpkConfig } from '../wpk.config';

/**
 * Bootstrap the WP Kernel runtime for this project.
 */
export function bootstrapKernel(): KernelInstance {
	return configureKernel({
		namespace: wpkConfig.namespace,
	});
}

export const kernel = bootstrapKernel();
