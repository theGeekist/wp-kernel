/**
 * WP Kernel Showcase Plugin - Entry Point
 *
 * Initializes the showcase plugin, registers resources, and mounts React UI.
 */

import { mountAdmin } from './admin';
import { job } from './resources';

// Type augmentation for window.wp
interface WPGlobal {
	wp?: {
		data?: {
			select: (storeKey: string) => unknown;
			createReduxStore?: unknown;
			register?: unknown;
		};
	};
}

/**
 * Initialize the showcase plugin
 * Registers stores and mounts UI
 */
export function init() {
	const globalWindow = window as Window & WPGlobal;

	console.log('[WP Kernel Showcase] Initializing...');

	// Check if wp.data is available (browser environment)
	if (!globalWindow.wp?.data) {
		console.error(
			'[WP Kernel Showcase] wp.data not available. Cannot register store.'
		);
		return;
	}

	console.log('[WP Kernel Showcase] wp.data available');

	// Force store registration by accessing .store getter
	// This triggers lazy registration in defineResource
	const store = job.store;
	console.log('[WP Kernel Showcase] Initialized with job resource:', {
		name: job.name,
		storeKey: job.storeKey,
		routes: Object.keys(job.routes),
		storeRegistered: !!store,
		wpDataAvailable: !!globalWindow.wp?.data,
	});

	// Verify store was registered and has selectors
	const registeredStore = globalWindow.wp.data.select(job.storeKey);
	console.log('[WP Kernel Showcase] Registered store:', registeredStore);
	console.log('[WP Kernel Showcase] Store type:', typeof registeredStore);
	console.log(
		'[WP Kernel Showcase] Store keys:',
		registeredStore ? Object.keys(registeredStore) : 'null'
	);
	console.log(
		'[WP Kernel Showcase] Has getList:',
		registeredStore &&
			typeof registeredStore === 'object' &&
			'getList' in registeredStore
	);

	if (!registeredStore) {
		console.error(
			`[WP Kernel Showcase] Store ${job.storeKey} not registered properly`
		);
		return;
	}

	console.log('[WP Kernel Showcase] Store verified');

	// Mount admin UI if root element exists
	const adminRoot = document.getElementById('wpk-admin-root');
	if (adminRoot) {
		console.log('[WP Kernel Showcase] Mounting admin UI...');
		// Add a small delay to let the store registration settle
		// This is a workaround for a potential timing issue with classic scripts
		setTimeout(() => {
			console.log(
				'[WP Kernel Showcase] After delay, checking store again...'
			);
			const storeAfterDelay = globalWindow.wp?.data?.select(job.storeKey);
			console.log(
				'[WP Kernel Showcase] Store after delay:',
				storeAfterDelay
			);
			mountAdmin();
		}, 100);
	}
}

// Auto-initialize on load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

// Export resources for use in other modules
export { job } from './resources/index';
export type { Job, JobListParams } from './resources/index';
