/**
 * WP Kernel Showcase Plugin - Entry Point
 *
 * Initializes the Kernel runtime and mounts admin UI.
 */

import type { KernelRegistry } from '@wpkernel/core/data';
import { mountAdmin } from './admin';
import { job } from './resources';
import { ShowcaseActionError } from './errors/ShowcaseActionError';
import { bootstrapKernel, kernel } from './bootstrap/kernel';

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

	// Initialize WP Kernel runtime (middleware + events plugin)
	bootstrapKernel(globalWindow.wp.data as KernelRegistry);

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
		const uiRuntime = kernel.getUIRuntime();
		if (!uiRuntime) {
			console.warn(
				'[WP Kernel Showcase] UI runtime unavailable. Ensure attachUIBindings is configured.'
			);
			return;
		}
		mountAdmin(uiRuntime);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

export { job } from './resources';
export type { JobListParams } from './resources';
