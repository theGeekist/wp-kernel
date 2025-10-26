/**
 * WP Kernel E2E Utils - Testing Utilities Package
 *
 * E2E testing helpers for WP Kernel projects
 *
 */

// Export extended test fixture (primary usage)
export { test, expect } from './test.js';

// Export factory for advanced users
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
export const VERSION = '0.4.0';

export {
	withIsolatedWorkspace,
	writeWorkspaceFiles,
} from './test-support/isolated-workspace.test-support.js';
export {
	withWorkspace,
	createWorkspaceRunner,
} from '@wpkernel/test-utils/integration';
export {
	collectManifestState,
	compareManifestStates,
} from './test-support/fs-manifest.test-support.js';
export { runNodeSnippet } from './test-support/cli-runner.test-support.js';
