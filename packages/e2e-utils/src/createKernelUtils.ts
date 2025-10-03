/**
 * WP Kernel E2E Utils
 *
 * Provides a single factory pattern for creating kernel-aware E2E utilities,
 * extending WordPress E2E test utils for use with WordPress Kernel applications.
 *
 * @module
 */

import type { Page } from '@playwright/test';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import type {
	EventRecorder,
	EventRecorderOptions,
	KernelUtils,
	ResourceConfig,
	ResourceUtils,
	StoreUtils,
	WordPressFixtures,
	CapturedEvent,
} from './types.js';

// Extend window type for namespace detection
declare global {
	interface Window {
		wpKernelNamespace?: string;
	}
}

/**
 * Create E2E utilities for WordPress Kernel
 *
 * @param wpFixtures - WordPress fixture context
 * @param config     - Optional resource configuration for custom namespace detection
 * @return Kernel E2E utilities
 */

/**
 * Create kernel-aware E2E utilities
 *
 * Single factory that produces resource, store, and event helpers
 * for testing WP Kernel applications.
 *
 * @param fixtures - WordPress E2E fixtures from test context
 * @return Kernel utilities object with helper factories
 *
 * @example
 * ```typescript
 * import { test, expect } from '@geekist/wp-kernel-e2e-utils';
 *
 * test('job workflow', async ({ page, admin, requestUtils, kernel }) => {
 *   const job = kernel.resource({ name: 'job', routes: {...} });
 *   await job.seed({ title: 'Engineer' });
 *
 *   const jobStore = kernel.store('my-plugin/job');
 *   await jobStore.wait(s => s.getList());
 *
 *   const recorder = await kernel.events({ pattern: /^my-plugin\.job\./ });
 *   expect(recorder.list()).toHaveLength(1);
 * });
 * ```
 */
export function createKernelUtils(fixtures: WordPressFixtures): KernelUtils {
	const { page, requestUtils } = fixtures;

	return {
		/**
		 * Create resource utilities for seeding and cleanup
		 * @param config
		 */
		resource: <T>(config: ResourceConfig): ResourceUtils<T> => {
			return createResourceHelper<T>(config, requestUtils);
		},

		/**
		 * Create store utilities for waiting on resolvers
		 * @param storeKey
		 */
		store: <T>(storeKey: string): StoreUtils<T> => {
			return createStoreHelper<T>(storeKey, page);
		},

		/**
		 * Create event recorder for capturing kernel events
		 * @param options
		 */
		events: async <P>(
			options?: EventRecorderOptions
		): Promise<EventRecorder<P>> => {
			return createEventHelper<P>(page, options);
		},
	};
}

/**
 * Internal: Create resource utilities
 *
 * Exported for testing only, not part of public API
 *
 * @internal
 * @param config       - Resource configuration
 * @param requestUtils - WordPress REST request utilities
 */
export function createResourceHelper<T>(
	config: ResourceConfig,
	requestUtils: RequestUtils
): ResourceUtils<T> {
	const { routes } = config;

	return {
		seed: async (data: Partial<T>): Promise<T & { id: number }> => {
			if (!routes.create) {
				throw new Error(
					`Resource "${config.name}" does not have a create route configured`
				);
			}

			const response = await requestUtils.rest({
				path: routes.create.path,
				method: routes.create.method as
					| 'GET'
					| 'POST'
					| 'PUT'
					| 'DELETE',
				data,
			});

			if (!response || typeof response !== 'object') {
				throw new Error(
					`Failed to seed resource "${config.name}": Invalid response`
				);
			}

			return response as T & { id: number };
		},

		seedMany: async (
			items: Partial<T>[]
		): Promise<Array<T & { id: number }>> => {
			if (!routes.create) {
				throw new Error(
					`Resource "${config.name}" does not have a create route configured`
				);
			}

			const createRoute = routes.create;

			const results = await Promise.all(
				items.map(async (data) => {
					const response = await requestUtils.rest({
						path: createRoute.path,
						method: createRoute.method as
							| 'GET'
							| 'POST'
							| 'PUT'
							| 'DELETE',
						data,
					});

					if (!response || typeof response !== 'object') {
						throw new Error(
							`Failed to seed resource "${config.name}": Invalid response`
						);
					}

					return response as T & { id: number };
				})
			);

			return results;
		},

		remove: async (id: number): Promise<void> => {
			if (!routes.remove) {
				throw new Error(
					`Resource "${config.name}" does not have a remove route configured`
				);
			}

			const path = routes.remove.path.replace(':id', String(id));

			await requestUtils.rest({
				path,
				method: routes.remove.method as
					| 'GET'
					| 'POST'
					| 'PUT'
					| 'DELETE',
			});
		},

		deleteAll: async (): Promise<void> => {
			if (!routes.list || !routes.remove) {
				throw new Error(
					`Resource "${config.name}" must have both list and remove routes for deleteAll()`
				);
			}

			const response = await requestUtils.rest({
				path: routes.list.path,
				method: routes.list.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
			});

			if (!Array.isArray(response)) {
				throw new Error(
					`Failed to list resources "${config.name}": Expected array response`
				);
			}

			const removeRoute = routes.remove;

			await Promise.all(
				response.map(async (item: unknown) => {
					if (!item || typeof item !== 'object' || !('id' in item)) {
						return;
					}

					const resourceItem = item as { id: number };
					const path = removeRoute.path.replace(
						':id',
						String(resourceItem.id)
					);

					await requestUtils.rest({
						path,
						method: removeRoute.method as
							| 'GET'
							| 'POST'
							| 'PUT'
							| 'DELETE',
					});
				})
			);
		},
	};
}

/**
 * Internal: Create store utilities
 *
 * Exported for testing only, not part of public API
 *
 * @internal
 * @param storeKey - WordPress data store key
 * @param page     - Playwright page instance
 */
export function createStoreHelper<T>(
	storeKey: string,
	page: Page
): StoreUtils<T> {
	return {
		wait: async <R>(
			selector: (state: T) => R,
			timeout = 5000
		): Promise<R> => {
			const startTime = Date.now();

			while (true) {
				const result = await page.evaluate(
					({ key, fn }) => {
						// Auto-detect namespace
						const namespace = window.wpKernelNamespace || 'wpk';
						const { select } = window.wp.data;

						// Try namespace-aware key first, fallback to original
						const namespacedKey = key.includes('/')
							? key
							: `${namespace}/${key}`;
						const store = select(namespacedKey) || select(key);

						if (!store) {
							throw new Error(
								`Store "${namespacedKey}" not found`
							);
						}

						// SECURITY FIX: Use safe eval instead of new Function()
						// Parse the function string more carefully
						try {
							// Extract the return statement from the function
							const fnBody = fn
								.replace(/^[^{]*{/, '') // Remove function signature and opening brace
								.replace(/}[^}]*$/, '') // Remove closing brace
								.trim();

							// Only allow simple property access patterns for security
							const returnMatch =
								fnBody.match(/^return\s+(.+);?$/);
							if (!returnMatch || !returnMatch[1]) {
								throw new Error(
									'Invalid selector: Only simple return statements allowed'
								);
							}

							const propertyPath = returnMatch[1].trim();
							if (
								!/^state(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(
									propertyPath
								)
							) {
								throw new Error(
									'Invalid selector: Only simple property access allowed'
								);
							}

							// SECURITY: Prevent prototype pollution attacks
							const props = propertyPath
								.replace(/^state\.?/, '')
								.split('.');

							// Reject dangerous property names
							const dangerousProps = [
								'__proto__',
								'constructor',
								'prototype',
							];
							for (const prop of props) {
								if (dangerousProps.includes(prop)) {
									throw new Error(
										`Security violation: Property "${prop}" is not allowed`
									);
								}
							}

							// Safe property access evaluation
							return props.reduce(
								(obj, prop) => obj?.[prop],
								store
							);
						} catch (error) {
							// Fallback for complex selectors - disable for security
							throw new Error(
								`Selector evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
							);
						}
					},
					{ key: storeKey, fn: selector.toString() }
				);

				if (result) {
					return result as R;
				}

				if (Date.now() - startTime > timeout) {
					throw new Error(
						`Timeout waiting for store "${storeKey}" selector after ${timeout}ms`
					);
				}

				await page.waitForTimeout(100);
			}
		},

		invalidate: async (): Promise<void> => {
			await page.evaluate((key) => {
				// Auto-detect namespace
				const namespace = window.wpKernelNamespace || 'wpk';
				const { dispatch } = window.wp.data;

				// Try namespace-aware key first, fallback to original
				const namespacedKey = key.includes('/')
					? key
					: `${namespace}/${key}`;
				const store = dispatch(namespacedKey) || dispatch(key);

				if (!store) {
					throw new Error(`Store "${namespacedKey}" not found`);
				}

				if ('invalidateResolution' in store) {
					const invalidateFn = store.invalidateResolution as (
						...args: unknown[]
					) => void;
					invalidateFn();
				}
			}, storeKey);
		},

		getState: async (): Promise<T> => {
			const state = await page.evaluate((key) => {
				// Auto-detect namespace
				const namespace = window.wpKernelNamespace || 'wpk';
				const { select } = window.wp.data;

				// Try namespace-aware key first, fallback to original
				const namespacedKey = key.includes('/')
					? key
					: `${namespace}/${key}`;
				const store = select(namespacedKey) || select(key);

				if (!store) {
					throw new Error(`Store "${namespacedKey}" not found`);
				}

				return store;
			}, storeKey);

			return state as T;
		},
	};
}

/**
 * Internal: Create event recorder
 *
 * Exported for testing only, not part of public API
 *
 * @internal
 * @param page    - Playwright page instance
 * @param options - Optional event filtering configuration
 */
export async function createEventHelper<P>(
	page: Page,
	options?: EventRecorderOptions
): Promise<EventRecorder<P>> {
	const pattern = options?.pattern;

	// Auto-detect namespace from browser context or default to 'wpk'
	// This maintains backward compatibility while enabling namespace support
	const namespace = await page.evaluate(() => {
		// Try to detect namespace from various sources
		const win = window as Window & { wpKernelNamespace?: string };
		if (typeof win.wpKernelNamespace === 'string') {
			return win.wpKernelNamespace;
		}
		// Could add other detection methods here in the future
		return 'wpk'; // Default fallback
	});

	const listenPattern = `${namespace}.*`;

	await page.evaluate(
		({ filterPattern, eventPattern }) => {
			if (!window.__wpkernelE2EEvents) {
				window.__wpkernelE2EEvents = [];
			}

			if (!window.__wpkernelE2EListenerActive) {
				const { addAction } = window.wp.hooks;

				addAction(eventPattern, 'wp-kernel-e2e', (payload: unknown) => {
					const eventType = window.wp.hooks.currentAction();

					if (filterPattern) {
						const regex = new RegExp(filterPattern);
						if (!regex.test(eventType)) {
							return;
						}
					}

					window.__wpkernelE2EEvents.push({
						type: eventType,
						payload,
						timestamp: Date.now(),
					});
				});

				window.__wpkernelE2EListenerActive = true;
			}
		},
		{ filterPattern: pattern?.source, eventPattern: listenPattern }
	);

	return {
		list: async (): Promise<CapturedEvent<P>[]> => {
			return page.evaluate(() => {
				return window.__wpkernelE2EEvents || [];
			}) as Promise<CapturedEvent<P>[]>;
		},

		find: async (type: string): Promise<CapturedEvent<P> | undefined> => {
			return page.evaluate((eventType) => {
				const events = window.__wpkernelE2EEvents || [];
				return events.find((e) => e.type === eventType);
			}, type) as Promise<CapturedEvent<P> | undefined>;
		},

		findAll: async (type: string): Promise<CapturedEvent<P>[]> => {
			return page.evaluate((eventType) => {
				const events = window.__wpkernelE2EEvents || [];
				return events.filter((e) => e.type === eventType);
			}, type) as Promise<CapturedEvent<P>[]>;
		},

		clear: async (): Promise<void> => {
			await page.evaluate(() => {
				window.__wpkernelE2EEvents = [];
			});
		},

		stop: async (): Promise<void> => {
			await page.evaluate((eventPattern) => {
				if (window.__wpkernelE2EListenerActive) {
					const { removeAction } = window.wp.hooks;
					removeAction(eventPattern, 'wp-kernel-e2e');
					window.__wpkernelE2EListenerActive = false;
				}
			}, listenPattern);
		},
	};
}

// Extend Window interface for TypeScript
declare global {
	interface Window {
		__wpkernelE2EEvents: Array<{
			type: string;
			payload: unknown;
			timestamp: number;
		}>;
		__wpkernelE2EListenerActive: boolean;
	}
}
