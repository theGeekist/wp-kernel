/**
 * Showcase Plugin - Example WP Kernel Product
 *
 * Demonstrates WP Kernel patterns and conventions
 */

import { job } from './resources';

export const VERSION = '0.2.0';

/**
 * Initialize the showcase plugin
 *
 * Registers stores and sets up the application.
 * This function is called when the script module loads.
 */
export function init() {
	// The store is automatically registered by defineResource
	// We just need to ensure the module is loaded
	console.log('[WP Kernel Showcase] Initialized with job resource:', {
		name: job.name,
		storeKey: job.storeKey,
		routes: Object.keys(job.routes),
	});
}

// Auto-initialize on load
init();

// Export resources for use in other modules
export { job } from './resources';
export type { Job, JobListParams } from './resources';
