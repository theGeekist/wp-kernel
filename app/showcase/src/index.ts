/**
 * WP Kernel Showcase Plugin - Entry Point
 */

import { mountAdmin } from './admin';
import { job } from './resources';
import { ShowcaseActionError } from './errors/ShowcaseActionError';

type WPWindow = typeof window & {
	wp?: {
		data?: unknown;
	};
};

/**
 * Initialize plugin resources and mount the admin UI if available.
 */
export function init(): void {
	const globalWindow = window as WPWindow;

	if (!globalWindow.wp?.data) {
		// Classic admin may load scripts out of order; fail quietly.
		console.warn('[WP Kernel Showcase] wp.data not available yet.');
		return;
	}

	try {
		// Trigger lazy store registration and warm initial data.
		void job.store;
		void job.prefetchList?.();
	} catch (error) {
		const wrapped = ShowcaseActionError.fromUnknown(error, {
			context: { actionName: 'Jobs.Init', resourceName: job.storeKey },
		});
		console.error(
			'[WP Kernel Showcase] Failed to prepare job resource:',
			wrapped
		);
	}

	const adminRoot = document.getElementById('wpk-admin-root');
	if (adminRoot) {
		mountAdmin();
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

export { job } from './resources';
export type { JobListParams } from './resources';
