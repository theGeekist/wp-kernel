/**
 * Showcase Plugin - Example WP Kernel Product
 *
 * Demonstrates WP Kernel patterns and conventions
 */

import { job } from './resources/index';
import { mountAdmin } from './admin/index';

export const VERSION = '0.2.0';

/**
 * Initialize the showcase plugin
 *
 * Registers stores and sets up the application.
 * This function is called when the script module loads.
 */
export function init() {
	// Force store registration by accessing the store property
	// This ensures the @wordpress/data store is registered before React renders
	const _ = job.store;

	console.log('[WP Kernel Showcase] Initialized with job resource:', {
		name: job.name,
		storeKey: job.storeKey,
		routes: Object.keys(job.routes),
		storeRegistered: !!_,
	});

	// If we're in admin and the mount point exists, mount admin UI
	const adminRoot = document.getElementById('wpk-admin-root');
	if (adminRoot) {
		console.log('[WP Kernel Showcase] Mounting admin UI...');
		try {
			mountAdmin();
		} catch (err) {
			console.error(
				'[WP Kernel Showcase] Failed to mount admin UI:',
				err
			);
		}
	}
}

// Auto-initialize on load
init();

// Export resources for use in other modules
export { job } from './resources/index';
export type { Job, JobListParams } from './resources/index';
