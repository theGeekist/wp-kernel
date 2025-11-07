/**
 * WPKernel E2E Utils - Testing Utilities Package
 *
 * E2E testing helpers for WPKernel projects
 *
 */

// Export extended test fixture (primary usage)
/**
 * Extended Playwright test fixture for WPKernel E2E tests.
 *
 * This provides a pre-configured test environment with WPKernel utilities
 * and assertions.
 *
 * @category Test Fixtures
 */
export { test, expect } from './test.js';

// Export factory for advanced users
/**
 * Creates a set of wpk utilities for E2E tests.
 *
 * This factory function provides helpers for interacting with resources, stores,
 * events, and data views within a WPKernel application during testing.
 *
 * @category Test Fixtures
 */
export {
	createWPKernelUtils,
	createResourceHelper,
	createStoreHelper,
	createEventHelper,
	createDataViewHelper,
} from './createWPKernelUtils.js';

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
	WPKernelUtils,
	WPKernelResourceConfig,
} from './types.js';

// Integration types
export type {
	FileManifest,
	FileManifestDiff,
	FileHashEntry,
	CliTranscript,
	IsolatedWorkspace,
	WorkspaceTools,
	WorkspaceRunOptions,
} from './integration/types.js';

// Test support types
export type {
	WithIsolatedWorkspaceOptions,
	WithWorkspaceCallback,
	WorkspaceFileTree,
} from './test-support/isolated-workspace.test-support.js';
export type {
	ManifestStateDefinition,
	ManifestComparisonDefinition,
	ManifestFileDefinition,
	ManifestMutationDefinition,
} from './test-support/fs-manifest.test-support.js';
export type { RunNodeSnippetOptions } from './test-support/cli-runner.test-support.js';

/**
 * Current version of WPKernel E2E Utils
 */
export const VERSION = '0.11.0';

/**
 * Creates a temporary, isolated workspace for E2E tests.
 *
 * This utility sets up a clean directory for each test, ensuring that tests
 * do not interfere with each other's file system state.
 *
 * @category Test Support
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
 * @category Test Support
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
 * @category Test Support
 */
export { runNodeSnippet } from './test-support/cli-runner.test-support.js';
