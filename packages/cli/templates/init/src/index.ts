import { configureKernel } from '@geekist/wp-kernel';
import type { KernelInstance } from '@geekist/wp-kernel';
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
