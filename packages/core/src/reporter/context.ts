/* eslint-disable jsdoc/check-tag-names -- allow Typedoc @category tags */
import type { Reporter } from './types';

let kernelReporter: Reporter | undefined;

/**
 * Register the shared kernel reporter instance.
 *
 * @param    reporter - Reporter to use for subsequent logging
 * @category Reporter
 */
export function setWPKernelReporter(reporter: Reporter | undefined): void {
	kernelReporter = reporter;
}

/**
 * Retrieve the shared kernel reporter, if configured.
 *
 * @return Reporter instance or undefined when not initialised
 * @category Reporter
 */
export function getWPKernelReporter(): Reporter | undefined {
	return kernelReporter;
}

/**
 * Clear the shared reporter reference.
 *
 * @category Reporter
 */
export function clearWPKReporter(): void {
	kernelReporter = undefined;
}

/* eslint-enable jsdoc/check-tag-names */
