/**
 * WP Kernel E2E Utils - Testing Utilities Package
 *
 * E2E testing helpers for WP Kernel projects
 *
 */

// Export extended test fixture (primary usage)
/**
 * Extended Playwright test fixture for WP Kernel E2E tests.
 *
 * This provides a pre-configured test environment with WP Kernel utilities
 * and assertions.
 *
 * @category E2E Testing
 */
export { test, expect } from './test.js';

// Export factory for advanced users
/**
 * Creates a set of kernel utilities for E2E tests.
 *
 * This factory function provides helpers for interacting with resources, stores,
 * events, and data views within a WP Kernel application during testing.
 *
 * @category E2E Testing
 */
export {
	createKernelUtils,
	createResourceHelper,
	createStoreHelper,
	createEventHelper,
	createDataViewHelper,
} from './createKernelUtils.js';

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
export const VERSION = '0.11.0';

/**
 * Creates a temporary, isolated workspace for E2E tests.
 *
 * This utility sets up a clean directory for each test, ensuring that tests
 * do not interfere with each other's file system state.
 *
 * @category E2E Testing
 */
export {
	withIsolatedWorkspace,
	writeWorkspaceFiles,
} from './test-support/isolated-workspace.test-support.js';
export {
	withWorkspace,
	createWorkspaceRunner,
} from '@wpkernel/test-utils/integration';
/**
 * Collects the file system manifest state for comparison.
 *
 * This utility captures the current state of files within a workspace,
 * which can then be compared against a previous state to detect changes.
 *
 * @category E2E Testing
 */
export {
	collectManifestState,
	compareManifestStates,
} from './test-support/fs-manifest.test-support.js';
/**
 * Runs a Node.js code snippet in a separate process.
 *
 * This is useful for testing CLI commands or other Node.js-based utilities
 * in an isolated environment.
 *
 * @category E2E Testing
 */
export { runNodeSnippet } from './test-support/cli-runner.test-support.js';
