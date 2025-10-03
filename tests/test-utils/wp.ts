/**
 * Test Utilities for WordPress Integration
 *
 * Centralized typed helpers that make WordPress testing easier and more consistent
 * across the entire monorepo test suite. These utilities work with the global
 * Jest setup to provide clean test state and proper TypeScript safety.
 */

// Import resetNamespaceCache for test cleanup
import { resetNamespaceCache } from '@geekist/wp-kernel/namespace';

/**
 * Ensure wp.data is available and return it with proper typing
 * Throws descriptive error if not properly initialized by setup
 *
 * @return Typed wp.data reference
 * @throws Error if wp.data not initialized
 */
export function ensureWpData(): any {
	if (!window.wp) {
		throw new Error(
			'window.wp not initialized. Ensure tests/setup-jest.ts is loaded via setupFilesAfterEnv'
		);
	}
	if (!window.wp.data) {
		throw new Error(
			'window.wp.data not initialized. Ensure tests/setup-jest.ts is loaded via setupFilesAfterEnv'
		);
	}
	return window.wp.data;
}

/**
 * Create a typed mock WordPress package object
 * Useful for testing namespace detection and package handling
 *
 * @param overrides      - Properties to override on the mock package
 * @param overrides.name - Package name override
 * @return Mock package object
 */
export function createMockWpPackage(overrides: { name?: string } = {}) {
	return {
		name: 'test-package',
		...overrides,
	};
}

/**
 * Safely set __WP_KERNEL_PACKAGE__ on globalThis with proper typing
 * Avoids TypeScript errors when setting kernel package data in tests
 *
 * @param packageData - Package data to set (null to clear)
 */
export function setKernelPackage(
	packageData: {
		name?: string;
		version?: string;
	} | null
) {
	if (packageData === null) {
		if ('__WP_KERNEL_PACKAGE__' in globalThis) {
			delete (globalThis as { __WP_KERNEL_PACKAGE__?: unknown })
				.__WP_KERNEL_PACKAGE__;
		}
	} else {
		(
			globalThis as {
				__WP_KERNEL_PACKAGE__?: { name?: string; version?: string };
			}
		).__WP_KERNEL_PACKAGE__ = packageData;
	}
}

/**
 * Set WordPress plugin data for namespace detection
 * Maps common plugin properties to the format expected by namespace detection
 *
 * @param data      - Plugin data
 * @param data.name - Plugin text domain (used for namespace detection)
 * @param data.slug - Plugin slug (optional)
 */
export function setWpPluginData(data: { name?: string; slug?: string }): void {
	ensureWpData();

	if (!window.wpKernelData) {
		window.wpKernelData = {};
	}

	// Map 'name' to 'textDomain' for namespace detection
	const pluginData = {
		textDomain: data.name,
		slug: data.slug,
	};

	Object.assign(window.wpKernelData, pluginData);
}

/**
 * Set process.env for Node.js context simulation
 * Useful for testing namespace detection in different environments
 *
 * @param env - Environment variables to set
 */
export function setProcessEnv(env: Record<string, string>): void {
	if (!global.process) {
		// Type assertion for test environment - Node.js process object
		(global as { process?: NodeJS.Process }).process = {
			env: {},
		} as NodeJS.Process;
	}
	Object.assign(global.process.env, env);
}

/**
 * Clear all namespace detection state
 * Removes WordPress plugin data and kernel package data to ensure clean test state
 */
export function clearNamespaceState(): void {
	// Clear WordPress plugin data completely
	if (window.wpKernelData) {
		delete window.wpKernelData;
	}

	// Clear kernel package data
	setKernelPackage(null);

	// Clear build-time defines
	if ('__WPK_NAMESPACE__' in globalThis) {
		delete (globalThis as any).__WPK_NAMESPACE__;
	}

	// Clear namespace detection cache
	resetNamespaceCache();
}
