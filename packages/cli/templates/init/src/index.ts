import { configureKernel } from '@wpkernel/core/data';
import type { KernelInstance } from '@wpkernel/core/data';
import { kernelConfig } from '../kernel.config';

/**
 * Bootstrap the WP Kernel runtime for this project.
 */
export function bootstrapKernel(): KernelInstance {
	return configureKernel({
		namespace: kernelConfig.namespace,
	});
}

export const kernel = bootstrapKernel();
