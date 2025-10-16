/**
 * WordPress Test Support Helpers
 *
 * Canonical helpers for interacting with the global WordPress runtime that our
 * Jest environment provisions in `tests/setup-jest.ts`. The functions exported
 * here are shared across packages through the `@wpkernel/test-utils/wp` entry
 * point and should be extended (instead of reimplemented) whenever new
 * WordPress-specific mocks are required.
 */

import { resetNamespaceCache } from '@wpkernel/core/namespace';
import { KernelError } from '@wpkernel/core/contracts';

/**
 * Shape returned by ensureWpData().
 */
export type WordPressData = {
	createReduxStore: jest.Mock;
	register: jest.Mock;
	dispatch: jest.Mock;
	select: jest.Mock;
	subscribe: jest.Mock;
	[key: string]: unknown;
};

/**
 * Ensure `window.wp.data` exists and return it. Throws a KernelError
 * with actionable guidance if the Jest environment failed to initialise the
 * WordPress globals. This keeps individual suites from silently passing with an
 * `any`-typed fallback.
 */
export function ensureWpData(): WordPressData {
	if (!window.wp) {
		throw new KernelError('DeveloperError', {
			message:
				'window.wp not initialized. Ensure tests/setup-jest.ts is loaded via setupFilesAfterEnv',
		});
	}

	if (!window.wp.data) {
		throw new KernelError('DeveloperError', {
			message:
				'window.wp.data not initialized. Ensure tests/setup-jest.ts is loaded via setupFilesAfterEnv',
		});
	}

	return window.wp.data as unknown as WordPressData;
}

/**
 * Convenience interface for building synthetic WordPress package metadata.
 */
export interface WordPressPackage {
	name?: string;
	version?: string;
}

/**
 * Create a typed mock WordPress package object.
 * @param overrides
 */
export function createMockWpPackage(overrides: WordPressPackage = {}) {
	return {
		name: 'test-package',
		...overrides,
	} satisfies WordPressPackage;
}

/**
 * Safely set `__WP_KERNEL_PACKAGE__` on the global scope with proper typing.
 * @param packageData
 */
export function setKernelPackage(packageData: WordPressPackage | null) {
	if (packageData === null) {
		if ('__WP_KERNEL_PACKAGE__' in globalThis) {
			delete (globalThis as { __WP_KERNEL_PACKAGE__?: unknown })
				.__WP_KERNEL_PACKAGE__;
		}
		return;
	}

	(
		globalThis as {
			__WP_KERNEL_PACKAGE__?: WordPressPackage;
		}
	).__WP_KERNEL_PACKAGE__ = packageData;
}

/**
 * Map WordPress plugin data for namespace detection. Exposed so suites can set
 * up predictable plugin metadata without directly mutating globals.
 * @param data
 * @param data.name
 * @param data.slug
 */
export function setWpPluginData(data: { name?: string; slug?: string }): void {
	ensureWpData();

	if (!window.wpKernelData) {
		window.wpKernelData = {};
	}

	const pluginData = {
		textDomain: data.name,
		slug: data.slug,
	} satisfies NonNullable<typeof window.wpKernelData>;

	Object.assign(window.wpKernelData, pluginData);
}

/**
 * Set {@link process.env} values in a test-safe way.
 * @param env
 */
export function setProcessEnv(env: Record<string, string>): void {
	if (!global.process) {
		(global as { process?: NodeJS.Process }).process = {
			env: {},
		} as NodeJS.Process;
	}

	Object.assign(global.process.env, env);
}

/**
 * Clear namespace-related global state so each test starts from a clean slate.
 */
export function clearNamespaceState(): void {
	if (window.wpKernelData) {
		delete window.wpKernelData;
	}

	setKernelPackage(null);

	if ('__WPK_NAMESPACE__' in globalThis) {
		delete (globalThis as { __WPK_NAMESPACE__?: unknown })
			.__WPK_NAMESPACE__;
	}

	resetNamespaceCache();
}
