import { configureWPKernel } from '@wpkernel/core/data';
import type { WPKInstance } from '@wpkernel/core/data';
// eslint-disable-next-line import/no-unresolved
import { wpkConfig } from '../wpk.config';

/**
 * Bootstrap the WP Kernel runtime for this project.
 */
export function bootstrapKernel(): WPKInstance {
	return configureWPKernel({
		namespace: wpkConfig.namespace,
	});
}

export const kernel = bootstrapKernel();
