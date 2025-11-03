import type { Reporter } from './types';

let wpKernelReporter: Reporter | undefined;

/**
 * Register the shared WP Kernel reporter instance.
 *
 * @param    reporter - Reporter to use for subsequent logging
 * @category Reporter
 */
export function setWPKernelReporter(reporter: Reporter | undefined): void {
	wpKernelReporter = reporter;
}

/**
 * Retrieve the shared WP Kernel reporter, if configured.
 *
 * @return Reporter instance or undefined when not initialised
 * @category Reporter
 */
export function getWPKernelReporter(): Reporter | undefined {
	return wpKernelReporter;
}

/**
 * Clear the shared reporter reference.
 *
 * @category Reporter
 */
export function clearWPKReporter(): void {
	wpKernelReporter = undefined;
}
