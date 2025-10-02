/**
 * Showcase Plugin - Example WP Kernel Product
 *
 * Demonstrates WP Kernel patterns and conventions
 */

import { job } from './resources/index';
import { mountAdmin } from './admin/index';

export const VERSION = '0.2.0';

// Type for WordPress global
interface WPGlobal {
	wp?: {
		data?: {
			select: (storeKey: string) => unknown;
			resolveSelect?: (storeKey: string) => {
				getList: () => Promise<unknown>;
			};
			createReduxStore?: unknown;
			register?: unknown;
		};
	};
}

/**
 * Initialize the showcase plugin
 *
 * Registers stores and sets up the application.
 * This function is called when the script module loads.
 */
export function init() {
	const globalWindow = window as Window & WPGlobal;

	// Ensure wp.data is available before trying to register stores
	if (typeof window === 'undefined' || !globalWindow.wp?.data) {
		console.error(
			'[WP Kernel Showcase] wp.data not available - cannot initialize'
		);
		return;
	}

	// Force store registration by accessing the store property
	// This ensures the @wordpress/data store is registered before React renders
	const store = job.store;

	console.log('[WP Kernel Showcase] Initialized with job resource:', {
		name: job.name,
		storeKey: job.storeKey,
		routes: Object.keys(job.routes),
		storeRegistered: !!store,
		wpDataAvailable: !!globalWindow.wp?.data,
	});

	// Verify the store is actually registered
	if (!globalWindow.wp.data.select(job.storeKey)) {
		console.error(
			`[WP Kernel Showcase] Store ${job.storeKey} not registered properly`
		);
		return;
	}

	// If we're in admin and the mount point exists, mount admin UI
	const adminRoot = document.getElementById('wpk-admin-root');
	if (adminRoot) {
		console.log('[WP Kernel Showcase] Mounting admin UI...');
		try {
			// Prefetch jobs data before mounting React
			// This ensures resolvers run before useSelect tries to access them
			if (globalWindow.wp?.data?.resolveSelect) {
				console.log('[WP Kernel Showcase] Prefetching jobs data...');
				console.log('[WP Kernel Showcase] Store key:', job.storeKey);
				console.log(
					'[WP Kernel Showcase] resolveSelect type:',
					typeof globalWindow.wp.data.resolveSelect
				);

				// Add timeout to prevent hanging forever
				const prefetchPromise = globalWindow.wp.data
					.resolveSelect(job.storeKey)
					.getList();

				console.log(
					'[WP Kernel Showcase] Prefetch promise created:',
					prefetchPromise
				);

				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(
						() =>
							reject(
								new Error('Prefetch timeout after 5 seconds')
							),
						5000
					);
				});

				Promise.race([prefetchPromise, timeoutPromise])
					.then((result) => {
						console.log(
							'[WP Kernel Showcase] ✅ Jobs prefetched successfully:',
							result
						);
						console.log('[WP Kernel Showcase] Mounting React...');
						// Data is now in the store, mount React
						mountAdmin();
					})
					.catch((err: Error) => {
						console.error(
							'[WP Kernel Showcase] ❌ Failed to prefetch jobs:',
							err
						);
						console.log(
							'[WP Kernel Showcase] Mounting React anyway...'
						);
						// Mount anyway so user sees error state
						mountAdmin();
					});
			} else {
				console.warn(
					'[WP Kernel Showcase] ⚠️ resolveSelect not available, using setTimeout fallback'
				);
				// Fallback if resolveSelect not available
				setTimeout(() => {
					mountAdmin();
				}, 10);
			}
		} catch (err) {
			console.error(
				'[WP Kernel Showcase] Failed to mount admin UI:',
				err
			);
		}
	}
}

// Auto-initialize on load
// For classic scripts, wait for DOM to be ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	// DOM is already ready
	init();
}

// Export resources for use in other modules
export { job } from './resources/index';
export type { Job, JobListParams } from './resources/index';
