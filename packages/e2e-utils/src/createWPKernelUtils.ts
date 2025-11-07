/**
 * WPKernel E2E Utils
 *
 * Provides a single factory pattern for creating wpkernel-aware E2E utilities,
 * extending WordPress E2E test utils for use with WordPress WPKernel applications.
 *
 * @module
 */

import { extractPathParams, interpolatePath } from '@wpkernel/core/resource';
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { Page } from '@playwright/test';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import type {
	DataViewHelper,
	DataViewHelperOptions,
	EventRecorder,
	EventRecorderOptions,
	WPKernelUtils,
	WPKernelResourceConfig,
	ResourceUtils,
	StoreUtils,
	WordPressFixtures,
	CapturedEvent,
} from './types.js';

type EvaluationErrorPayload = {
	message: string;
	context?: Record<string, unknown>;
	data?: Record<string, unknown>;
};

type EvaluationResult<T> = {
	value?: T;
	status?: string;
	error?: EvaluationErrorPayload;
};

// Extend window type for namespace detection
declare global {
	interface Window {
		wpKernelNamespace?: string;
	}
}

/**
 * Create E2E utilities for WordPress WPKernel
 *
 * @param wpFixtures - WordPress fixture context
 * @param config     - Optional resource configuration for custom namespace detection
 * @return WPKernel E2E utilities
 */

/**
 * Create WPkernel-aware E2E utilities
 *
 * Single factory that produces resource, store, and event helpers
 * for testing WPKernel applications.
 *
 * @category Test Fixtures
 * @param    fixtures - WordPress E2E fixtures from test context
 * @return WPKernel utilities object with helper factories
 *
 * @example
 * ```typescript
 * import { test, expect } from '@wpkernel/e2e-utils';
 *
 * test('job workflow', async ({ page, admin, requestUtils, wpkernel }) => {
 *   const job = wpkernel.resource({ name: 'job', routes: {...} });
 *   await job.seed({ title: 'Engineer' });
 *
 *   const jobStore = wpkernel.store('my-plugin/job');
 *   await jobStore.wait(s => s.getList());
 *
 *   const recorder = await wpkernel.events({ pattern: /^my-plugin\.job\./ });
 *   expect(recorder.list()).toHaveLength(1);
 * });
 * ```
 */
export function createWPKernelUtils(
	fixtures: WordPressFixtures
): WPKernelUtils {
	const { page, requestUtils } = fixtures;

	return {
		/**
		 * Create resource utilities for seeding and cleanup
		 *
		 * @category Resource Helpers
		 * @param    config
		 */
		resource: <T>(config: WPKernelResourceConfig): ResourceUtils<T> => {
			return createResourceHelper<T>(config, requestUtils);
		},

		/**
		 * Create store utilities for waiting on resolvers
		 *
		 * @category Store Utilities
		 * @param    storeKey
		 */
		store: <T>(storeKey: string): StoreUtils<T> => {
			return createStoreHelper<T>(storeKey, page);
		},

		/**
		 * Create event recorder for capturing wpkernel events
		 *
		 * @category Event Utilities
		 * @param    options
		 */
		events: async <P>(
			options?: EventRecorderOptions
		): Promise<EventRecorder<P>> => {
			return createEventHelper<P>(page, options);
		},

		/**
		 * Convenience helper for interacting with ResourceDataView surfaces.
		 *
		 * @category DataView Helpers
		 * @param    options
		 */
		dataview: (options: DataViewHelperOptions): DataViewHelper => {
			return createDataViewHelper(page, options);
		},
	};
}

/**
 * Internal: Create resource utilities
 *
 * Exported for testing only, not part of public API
 *
 * @category Resource Helpers
 * @internal
 * @param    config       - Resource configuration
 * @param    requestUtils - WordPress REST request utilities
 */
export function createResourceHelper<T>(
	config: WPKernelResourceConfig,
	requestUtils: RequestUtils
): ResourceUtils<T> {
	const { routes } = config;

	const removeRouteParam = routes.remove
		? extractPathParams(routes.remove.path)[0]
		: undefined;

	const buildRemovePath = (
		identifier: string | number
	): string | undefined => {
		if (!routes.remove) {
			return undefined;
		}

		if (!removeRouteParam) {
			return routes.remove.path;
		}

		try {
			return interpolatePath(routes.remove.path, {
				[removeRouteParam]: identifier,
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unknown interpolation error';

			throw new WPKernelError('DeveloperError', {
				message: `Failed to interpolate remove path for resource "${config.name}": ${message}`,
				context: {
					resourceName: config.name,
					template: routes.remove.path,
				},
				data:
					error instanceof Error
						? { originalError: error }
						: undefined,
			});
		}
	};

	const resolveIdentifier = (item: unknown): string | number | undefined => {
		if (config.store?.getId) {
			const value = config.store.getId(item as T);
			if (typeof value === 'string' || typeof value === 'number') {
				return value;
			}
		}

		if (item && typeof item === 'object' && 'id' in item) {
			const candidate = (item as { id?: unknown }).id;
			if (
				typeof candidate === 'string' ||
				typeof candidate === 'number'
			) {
				return candidate;
			}
		}

		return undefined;
	};

	return {
		seed: async (
			data: Partial<T>
		): Promise<T & { id: string | number }> => {
			if (!routes.create) {
				throw new WPKernelError('DeveloperError', {
					message: `Resource "${config.name}" does not have a create route configured`,
					context: { resourceName: config.name },
				});
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
				throw new WPKernelError('UnknownError', {
					message: `Failed to seed resource "${config.name}": Invalid response`,
					context: { resourceName: config.name },
				});
			}

			const identifier = resolveIdentifier(response);
			if (identifier === undefined) {
				throw new WPKernelError('DeveloperError', {
					message: `Failed to seed resource "${config.name}": Missing identifier`,
					context: { resourceName: config.name },
				});
			}

			return { ...(response as T), id: identifier } as T & {
				id: string | number;
			};
		},

		seedMany: async (
			items: Partial<T>[]
		): Promise<Array<T & { id: string | number }>> => {
			if (!routes.create) {
				throw new WPKernelError('DeveloperError', {
					message: `Resource "${config.name}" does not have a create route configured`,
					context: { resourceName: config.name },
				});
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
						throw new WPKernelError('UnknownError', {
							message: `Failed to seed resource "${config.name}": Invalid response`,
							context: { resourceName: config.name },
						});
					}

					const identifier = resolveIdentifier(response);
					if (identifier === undefined) {
						throw new WPKernelError('DeveloperError', {
							message: `Failed to seed resource "${config.name}": Missing identifier`,
							context: { resourceName: config.name },
						});
					}

					return { ...(response as T), id: identifier } as T & {
						id: string | number;
					};
				})
			);

			return results;
		},

		remove: async (id: string | number): Promise<void> => {
			if (!routes.remove) {
				throw new WPKernelError('DeveloperError', {
					message: `Resource "${config.name}" does not have a remove route configured`,
					context: { resourceName: config.name },
				});
			}

			const path = buildRemovePath(id);

			if (!path) {
				throw new WPKernelError('DeveloperError', {
					message: `Resource "${config.name}" does not have a remove route configured`,
					context: { resourceName: config.name },
				});
			}

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
				throw new WPKernelError('DeveloperError', {
					message: `Resource "${config.name}" must have both list and remove routes for deleteAll()`,
					context: { resourceName: config.name },
				});
			}

			const response = await requestUtils.rest({
				path: routes.list.path,
				method: routes.list.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
			});

			if (!Array.isArray(response)) {
				throw new WPKernelError('UnknownError', {
					message: `Failed to list resources "${config.name}": Expected array response`,
					context: { resourceName: config.name },
				});
			}

			const removeRoute = routes.remove;

			await Promise.all(
				response.map(async (item: unknown) => {
					const identifier = resolveIdentifier(item);
					if (identifier === undefined) {
						return;
					}

					const path = buildRemovePath(identifier);
					if (!path) {
						throw new WPKernelError('DeveloperError', {
							message: `Resource "${config.name}" does not have a remove route configured`,
							context: { resourceName: config.name },
						});
					}

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

function buildDataViewSelector(options: DataViewHelperOptions): string {
	const base = `[data-wpk-dataview="${options.resource}"]`;
	if (options.namespace) {
		return `${base}[data-wpk-dataview-namespace="${options.namespace}"]`;
	}
	return base;
}

/**
 * Create helpers for interacting with ResourceDataView surfaces in Playwright.
 *
 * @category DataView Helpers
 * @param    page    - Playwright page instance used for queries.
 * @param    options - Target resource and optional namespace selectors.
 * @return Collection of DataView helper utilities.
 */
export function createDataViewHelper(
	page: Page,
	options: DataViewHelperOptions
): DataViewHelper {
	const selector = buildDataViewSelector(options);
	const combinedSelector = options.within
		? `${options.within} ${selector}`
		: selector;

	const root = (): ReturnType<Page['locator']> => {
		if (options.within) {
			return page.locator(options.within).locator(selector);
		}
		return page.locator(selector);
	};

	const waitForLoaded = async () => {
		await page.waitForFunction((target) => {
			const node = document.querySelector(target);
			return node?.getAttribute('data-wpk-dataview-loading') === 'false';
		}, combinedSelector);
	};

	const search = async (value: string) => {
		const input = root().locator('.dataviews-search input').first();
		await input.fill(value);
		await input.press('Enter');
	};

	const clearSearch = async () => search('');

	const getRow = (text: string) =>
		root()
			.locator('.dataviews-view-table__row')
			.filter({ hasText: text })
			.first();

	const selectRow = async (text: string) => {
		const row = getRow(text);
		await row
			.locator('.dataviews-selection-checkbox input')
			.first()
			.click();
	};

	const runBulkAction = async (label: string) => {
		await root()
			.locator('.dataviews-bulk-actions-footer__action-buttons button')
			.filter({ hasText: label })
			.first()
			.click();
	};

	const getSelectedCount = async () => {
		try {
			const text = await root()
				.locator('.dataviews-bulk-actions-footer__item-count')
				.first()
				.innerText();
			const match = text.match(/\d+/);
			return match ? Number(match[0]) : 0;
		} catch (_error) {
			return 0;
		}
	};

	const getTotalCount = async () => {
		const value = await root().getAttribute('data-wpk-dataview-total');
		if (!value) {
			return 0;
		}
		const parsed = Number(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	};

	return {
		root,
		waitForLoaded,
		search,
		clearSearch,
		getRow,
		selectRow,
		runBulkAction,
		getSelectedCount,
		getTotalCount,
	};
}

/**
 * Regex pattern to match return statements in selector functions
 * @internal
 */
const SELECTOR_RETURN_PATTERN = /return\s+([^;]+);?/;

/**
 * Regex pattern to validate safe property access patterns
 * Allows only simple dot notation like `state.prop1.prop2`
 * @internal
 */
const SAFE_SELECTOR_PATTERN = /^state(?:\.[a-zA-Z_$][\w$]*)*$/;

/**
 * Set of forbidden property names that cannot be accessed
 * Prevents prototype pollution and constructor access
 * @internal
 */
const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Extract property path from a selector function
 *
 * Parses a selector function and extracts the property access path as an array.
 * Only supports simple property access patterns like `state.prop1.prop2`.
 * Throws an error for complex expressions or forbidden properties.
 *
 * @internal
 * @param selector - Selector function that accesses state properties
 * @return Array of property names representing the access path
 * @throws Error if selector contains unsupported patterns or forbidden properties
 *
 * @example
 * ```ts
 * extractSelectorPath((state) => state.jobs)
 * // Returns: ['jobs']
 *
 * extractSelectorPath((state) => state.data.items)
 * // Returns: ['data', 'items']
 * ```
 */
function extractSelectorPath<T>(selector: (state: T) => unknown): string[] {
	const source = selector.toString().trim();
	const expression = source.includes('=>')
		? extractArrowExpression(source)
		: extractFunctionExpression(source);

	if (!expression) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Invalid selector: Only simple property access is supported',
		});
	}

	const candidate = expression.replace(/;$/, '');
	if (!SAFE_SELECTOR_PATTERN.test(candidate)) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Invalid selector: Only simple property access is supported',
		});
	}

	const path =
		candidate === 'state'
			? []
			: candidate.replace(/^state\./, '').split('.');

	for (const segment of path) {
		if (FORBIDDEN_PROPS.has(segment)) {
			throw new WPKernelError('DeveloperError', {
				message: `Security violation: Property "${segment}" is not allowed`,
				context: { property: segment },
			});
		}
	}

	return path.filter(Boolean);
}

/**
 * Extract the expression body from an arrow function selector
 *
 * Handles both implicit return (`state => state.prop`) and
 * explicit return (`state => { return state.prop; }`) syntax.
 *
 * @internal
 * @param source - Source code of the arrow function
 * @return Extracted expression or null if parsing fails
 */
function extractArrowExpression(source: string): string | null {
	const [, rawBody = ''] = source.split('=>', 2);
	const body = rawBody.trim();

	if (!body.startsWith('{')) {
		return body.replace(/;$/, '').trim();
	}

	const trimmed = body.replace(/^{/, '').replace(/}$/, '').trim();
	return extractReturnExpression(trimmed);
}

/**
 * Extract the expression body from a traditional function selector
 *
 * Parses function declarations/expressions to find the return statement.
 *
 * @internal
 * @param source - Source code of the function
 * @return Extracted expression or null if parsing fails
 */
function extractFunctionExpression(source: string): string | null {
	return extractReturnExpression(source);
}

/**
 * Extract the expression from a return statement
 *
 * Uses regex to find and extract the expression following `return`.
 *
 * @internal
 * @param body - Function body containing the return statement
 * @return Extracted expression or null if no return statement found
 */
function extractReturnExpression(body: string): string | null {
	const match = body.match(SELECTOR_RETURN_PATTERN);
	return match?.[1]?.trim() ?? null;
}

/**
 * Internal: Create store utilities
 *
 * Exported for testing only, not part of public API
 *
 * @category Store Utilities
 * @internal
 * @param    storeKey - WordPress data store key
 * @param    page     - Playwright page instance
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
			const propertyPath = extractSelectorPath(selector);

			while (true) {
				const evaluation = await page.evaluate<
					EvaluationResult<unknown>,
					{ key: string; path: string[] }
				>(
					({ key, path }) => {
						// Auto-detect namespace
						const namespace =
							window.wpKernelNamespace || WPK_NAMESPACE;
						const { select } = window.wp.data;

						// Try namespace-aware key first, fallback to original
						const namespacedKey = key.includes('/')
							? key
							: `${namespace}/${key}`;
						const store = select(namespacedKey) || select(key);

						if (!store) {
							return {
								error: {
									message: `Store "${namespacedKey}" not found`,
									context: { namespacedKey },
								},
							};
						}

						// SECURITY FIX: Use safe eval instead of new Function()
						try {
							const value = path.reduce<unknown>(
								(current: unknown, segment: string) => {
									if (
										current &&
										typeof current === 'object' &&
										segment in current
									) {
										return (
											current as Record<string, unknown>
										)[segment];
									}
									return undefined;
								},
								store as unknown
							);

							return { value };
						} catch (error) {
							return {
								error: {
									message: `Selector evaluation failed: ${
										error instanceof Error
											? error.message
											: 'Unknown error'
									}`,
									data:
										error instanceof Error
											? { stack: error.stack }
											: undefined,
								},
							};
						}
					},
					{ key: storeKey, path: propertyPath }
				);

				if (evaluation?.error) {
					throw new WPKernelError('DeveloperError', {
						message: evaluation.error.message,
						context: {
							storeKey,
							...evaluation.error.context,
						},
						data: evaluation.error.data,
					});
				}

				const result = evaluation?.value;
				if (result) {
					return result as R;
				}

				if (Date.now() - startTime > timeout) {
					throw new WPKernelError('TimeoutError', {
						message: `Timeout waiting for store "${storeKey}" selector after ${timeout}ms`,
						context: { storeKey, timeout },
					});
				}

				await page.waitForTimeout(100);
			}
		},

		invalidate: async (): Promise<void> => {
			const evaluation = await page.evaluate<
				EvaluationResult<void>,
				string
			>((key) => {
				// Auto-detect namespace
				const namespace = window.wpKernelNamespace || WPK_NAMESPACE;
				const { dispatch } = window.wp.data;

				// Try namespace-aware key first, fallback to original
				const namespacedKey = key.includes('/')
					? key
					: `${namespace}/${key}`;
				const store = dispatch(namespacedKey) || dispatch(key);

				if (!store) {
					return {
						error: {
							message: `Store "${namespacedKey}" not found`,
							context: { namespacedKey },
						},
					};
				}

				if ('invalidateResolution' in store) {
					const invalidateFn = store.invalidateResolution as (
						...args: unknown[]
					) => void;
					invalidateFn();
				}

				return { status: 'ok' };
			}, storeKey);

			if (evaluation?.error) {
				throw new WPKernelError('DeveloperError', {
					message: evaluation.error.message,
					context: {
						storeKey,
						...evaluation.error.context,
					},
				});
			}
		},

		getState: async (): Promise<T> => {
			const evaluation = await page.evaluate<
				EvaluationResult<unknown>,
				string
			>((key) => {
				// Auto-detect namespace
				const namespace = window.wpKernelNamespace || WPK_NAMESPACE;
				const { select } = window.wp.data;

				// Try namespace-aware key first, fallback to original
				const namespacedKey = key.includes('/')
					? key
					: `${namespace}/${key}`;
				const store = select(namespacedKey) || select(key);

				if (!store) {
					return {
						error: {
							message: `Store "${namespacedKey}" not found`,
							context: { namespacedKey },
						},
					};
				}

				return { value: store };
			}, storeKey);

			if (evaluation?.error) {
				throw new WPKernelError('DeveloperError', {
					message: evaluation.error.message,
					context: {
						storeKey,
						...evaluation.error.context,
					},
				});
			}

			return evaluation?.value as T;
		},
	};
}

/**
 * Internal: Create event recorder
 *
 * Exported for testing only, not part of public API
 *
 * @category Event Utilities
 * @internal
 * @param    page    - Playwright page instance
 * @param    options - Optional event filtering configuration
 */
export async function createEventHelper<P>(
	page: Page,
	options?: EventRecorderOptions
): Promise<EventRecorder<P>> {
	const pattern = options?.pattern;

	// Auto-detect namespace from browser context or default to WPK_NAMESPACE
	// This maintains backward compatibility while enabling namespace support
	const namespace = await page.evaluate(() => {
		// Try to detect namespace from various sources
		const win = window as Window & { wpKernelNamespace?: string };
		if (typeof win.wpKernelNamespace === 'string') {
			return win.wpKernelNamespace;
		}
		// Could add other detection methods here in the future
		return WPK_NAMESPACE; // Default fallback
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
