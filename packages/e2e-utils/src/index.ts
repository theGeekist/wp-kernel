/**
 * WP Kernel E2E Utils - Testing Utilities Package
 *
 * E2E testing helpers for WP Kernel projects
 *
 * @module
 */

// Export extended test fixture (primary usage)
export { test, expect } from './test.js';

// Export factory for advanced users
export { createKernelUtils } from './createKernelUtils.js';

// Export all types
export type {
	DataViewHelper,
	DataViewHelperOptions,
	WordPressFixtures,
	ResourceConfig,
	ResourceUtils,
	StoreUtils,
	EventRecorderOptions,
	CapturedEvent,
	EventRecorder,
	KernelUtils,
} from './types.js';

/**
 * Current version of WP Kernel E2E Utils
 */
export const VERSION = '1.0.0';
