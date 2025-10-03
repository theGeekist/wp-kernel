/**
 * Resource definition and client generation
 *
 * Core function for declaring typed REST resources with automatic
 * client methods, store keys, and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import { KernelError } from '../error/KernelError';
import { registerStoreKey, invalidate as globalInvalidate } from './cache';
import { createStore } from './store';
import { validateConfig } from './validation';
import { createClient } from './client';
import { createDefaultCacheKeys } from './utils';
import { getNamespace } from '../namespace';
import {
	createSelectGetter,
	createUseGetter,
	createGetGetter,
	createMutateGetter,
	createCacheGetter,
	createStoreApiGetter,
	createEventsGetter,
} from './grouped-api';
import type { CacheKeys, ResourceConfig, ResourceObject } from './types';

/**
 * Parse namespace:name syntax from a string
 *
 * @param name - String that may contain namespace:name syntax
 * @return Parsed namespace and resource name, or null if invalid
 */
function parseNamespaceFromString(
	name: string
): { namespace: string; resourceName: string } | null {
	if (!name.includes(':')) {
		return null;
	}

	const parts = name.split(':', 2);
	const namespace = parts[0];
	const resourceName = parts[1];

	if (namespace && resourceName) {
		return { namespace, resourceName };
	}

	return null;
}

/**
 * Resolve namespace from config with support for shorthand syntax
 *
 * @param config - Resource configuration
 * @return Resolved namespace and resource name
 */
function resolveNamespaceAndName<T, TQuery>(
	config: ResourceConfig<T, TQuery>
): { namespace: string; resourceName: string } {
	// If explicit namespace is provided, use it
	if (config.namespace) {
		// If name also contains colon syntax, parse the resource name part
		// This handles the edge case where both are provided
		const parsed = parseNamespaceFromString(config.name);
		if (parsed) {
			return {
				namespace: config.namespace,
				resourceName: parsed.resourceName,
			};
		}
		return { namespace: config.namespace, resourceName: config.name };
	}

	// Check for shorthand namespace:name syntax
	const parsed = parseNamespaceFromString(config.name);
	if (parsed) {
		return parsed;
	}

	// Use auto-detection
	const namespace = getNamespace();
	return { namespace, resourceName: config.name };
}

/**
 * Define a resource with typed REST client
 *
 * Creates a resource object with:
 * - Typed client methods (fetchList, fetch, create, update, remove)
 * - Store key for @wordpress/data registration
 * - Cache key generators for invalidation
 * - Route definitions
 * - Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
 * - Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)
 *
 * @template T - Resource entity type (e.g., TestimonialPost)
 * @template TQuery - Query parameters type for list operations (e.g., { search?: string })
 * @param    config - Resource configuration
 * @return Resource object with client methods and metadata
 * @throws DeveloperError if configuration is invalid
 * @example
 * ```ts
 * // Auto-detection (90% case) - namespace detected from plugin context
 * const testimonial = defineResource<TestimonialPost, { search?: string }>({
 *   name: 'testimonial',
 *   routes: {
 *     list: { path: '/my-plugin/v1/testimonials', method: 'GET' },
 *     get: { path: '/my-plugin/v1/testimonials/:id', method: 'GET' },
 *     create: { path: '/my-plugin/v1/testimonials', method: 'POST' }
 *   },
 *   cacheKeys: {
 *     list: (q) => ['testimonial', 'list', q?.search],
 *     get: (id) => ['testimonial', 'get', id]
 *   }
 * });
 * // Events: 'my-plugin.testimonial.created', Store: 'my-plugin/testimonial'
 *
 * // Explicit namespace override
 * const job = defineResource<Job>({
 *   name: 'job',
 *   namespace: 'custom-hr',
 *   routes: { list: { path: '/custom-hr/v1/jobs', method: 'GET' } }
 * });
 * // Events: 'custom-hr.job.created', Store: 'custom-hr/job'
 *
 * // Shorthand namespace:name syntax
 * const task = defineResource<Task>({
 *   name: 'acme:task',
 *   routes: { list: { path: '/acme/v1/tasks', method: 'GET' } }
 * });
 * // Events: 'acme.task.created', Store: 'acme/task'
 * ```
 */
export function defineResource<T = unknown, TQuery = unknown>(
	config: ResourceConfig<T, TQuery>
): ResourceObject<T, TQuery> {
	// Resolve namespace and resource name first
	const { namespace, resourceName } = resolveNamespaceAndName(config);

	// Create a normalized config for validation
	const normalizedConfig = {
		...config,
		name: resourceName,
	};

	// Validate configuration (throws on error)
	validateConfig(normalizedConfig);

	// Create client methods using original config (for routes)
	const client = createClient<T, TQuery>(config);

	// Create or use provided cache keys
	const cacheKeys: Required<CacheKeys> = {
		...createDefaultCacheKeys(resourceName),
		...config.cacheKeys,
	};

	// Lazy store initialization
	let _store: unknown = null;
	let _storeRegistered = false;

	// Build resource object
	const resource: ResourceObject<T, TQuery> = {
		...client,
		name: resourceName,
		storeKey: `${namespace}/${resourceName}`,
		cacheKeys,
		routes: config.routes,

		// Lazy-load and register @wordpress/data store on first access
		get store() {
			if (!_storeRegistered) {
				// Register store key for invalidation tracking
				registerStoreKey(resource.storeKey);

				// Create store descriptor
				const storeDescriptor = createStore<T, TQuery>({
					resource: resource as ResourceObject<T, TQuery>,
				});

				// Check if @wordpress/data is available (browser environment)
				const globalWp =
					typeof window !== 'undefined'
						? (window as WPGlobal).wp
						: undefined;
				if (
					globalWp?.data?.createReduxStore &&
					globalWp?.data?.register
				) {
					// Use createReduxStore to create a proper store descriptor
					const reduxStore = globalWp.data.createReduxStore(
						resource.storeKey,
						{
							reducer: storeDescriptor.reducer,
							actions: storeDescriptor.actions,
							selectors: storeDescriptor.selectors,
							resolvers: storeDescriptor.resolvers,
							initialState: storeDescriptor.initialState,
						}
					);
					globalWp.data.register(reduxStore);
				}

				_store = storeDescriptor;
				_storeRegistered = true;
			}
			return _store;
		},

		// Thin-flat API: React hooks
		useGet: config.routes.get
			? (id: string | number) => {
					// Check if we're in a React context (useSelect available)
					const globalWp =
						typeof window !== 'undefined'
							? (window as WPGlobal).wp
							: undefined;
					if (!globalWp?.data?.useSelect) {
						throw new KernelError('DeveloperError', {
							message:
								'useGet requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'useGet',
							},
						});
					}

					// Use @wordpress/data useSelect to watch store
					const result = globalWp.data.useSelect(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(select: any) => {
							// Trigger lazy store registration
							void resource.store;

							const storeSelect = select(resource.storeKey);
							const data = storeSelect?.getItem?.(id);
							const isResolving = storeSelect?.isResolving?.(
								'getItem',
								[id]
							);
							const hasResolved =
								storeSelect?.hasFinishedResolution?.(
									'getItem',
									[id]
								);
							const error = storeSelect?.getItemError?.(id);

							return {
								data,
								isLoading: isResolving || !hasResolved,
								error: error?.message,
							};
						},
						[id]
					);

					return result;
				}
			: undefined,

		useList: config.routes.list
			? (query?: TQuery) => {
					// Check if we're in a React context (useSelect available)
					const globalWp =
						typeof window !== 'undefined'
							? (window as WPGlobal).wp
							: undefined;
					if (!globalWp?.data?.useSelect) {
						throw new KernelError('DeveloperError', {
							message:
								'useList requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'useList',
							},
						});
					}

					// Use @wordpress/data useSelect to watch store
					const result = globalWp.data.useSelect(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(select: any) => {
							// Trigger lazy store registration
							void resource.store;

							const storeSelect = select(resource.storeKey);
							const data = storeSelect?.getList?.(query);
							const isResolving = storeSelect?.isResolving?.(
								'getList',
								[query]
							);
							const hasResolved =
								storeSelect?.hasFinishedResolution?.(
									'getList',
									[query]
								);
							const error = storeSelect?.getListError?.(query);

							return {
								data,
								isLoading: isResolving || !hasResolved,
								error: error?.message,
							};
						},
						[query]
					);

					return result;
				}
			: undefined,

		// Thin-flat API: Prefetch methods
		prefetchGet: config.routes.get
			? async (id: string | number) => {
					// Check if @wordpress/data is available
					const globalWp =
						typeof window !== 'undefined'
							? (window as WPGlobal).wp
							: undefined;
					if (!globalWp?.data?.dispatch) {
						throw new KernelError('DeveloperError', {
							message:
								'prefetchGet requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'prefetchGet',
							},
						});
					}

					// Trigger lazy store registration
					void resource.store;

					// Dispatch resolver (fire and forget)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const storeDispatch = globalWp.data.dispatch as any;
					const dispatch = storeDispatch(resource.storeKey);
					if (dispatch?.getItem) {
						// Trigger the resolver by selecting
						await globalWp.data
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							.resolveSelect(resource.storeKey as any)
							.getItem(id);
					}
				}
			: undefined,

		prefetchList: config.routes.list
			? async (query?: TQuery) => {
					// Check if @wordpress/data is available
					const globalWp =
						typeof window !== 'undefined'
							? (window as WPGlobal).wp
							: undefined;
					if (!globalWp?.data?.dispatch) {
						throw new KernelError('DeveloperError', {
							message:
								'prefetchList requires @wordpress/data to be loaded',
							context: {
								resource: config.name,
								method: 'prefetchList',
							},
						});
					}

					// Trigger lazy store registration
					void resource.store;

					// Dispatch resolver (fire and forget)

					await globalWp.data
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.resolveSelect(resource.storeKey as any)
						.getList(query);
				}
			: undefined,

		// Thin-flat API: Cache management
		invalidate: (
			patterns: (string | number | boolean | null | undefined)[][]
		) => {
			// Call global invalidate with resource context
			globalInvalidate(patterns, { storeKey: resource.storeKey });
		},

		key: (
			operation: 'list' | 'get' | 'create' | 'update' | 'remove',
			params?: TQuery | string | number | Partial<T>
		): (string | number | boolean)[] => {
			// Access the appropriate cache key generator
			// Note: createDefaultCacheKeys always provides all operations,
			// so generator is guaranteed to exist
			const generator = cacheKeys[operation];

			// Generate and return the cache key
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cacheKey = generator(params as any);

			// Filter out null and undefined values
			return cacheKey.filter(
				(v): v is string | number | boolean =>
					v !== null && v !== undefined
			);
		},

		// Grouped API: Pure selectors (no fetching)
		// ===================================================================
		// GROUPED API - Organized namespaces for power users
		// ===================================================================

		// Grouped API: Pure selectors (read from cache)
		get select() {
			return createSelectGetter<T, TQuery>(config).call(this);
		},

		// Grouped API: React hooks (alias to thin-flat)
		get use() {
			return createUseGetter<T, TQuery>().call(this);
		},

		// Grouped API: Explicit data fetching (bypass cache, direct REST calls)
		get get() {
			return createGetGetter<T, TQuery>(config).call(this);
		},

		// Grouped API: Mutations
		get mutate() {
			return createMutateGetter<T, TQuery>(config).call(this);
		},

		// Grouped API: Cache control
		get cache() {
			return createCacheGetter<T, TQuery>(
				normalizedConfig,
				cacheKeys
			).call(this);
		},

		// Grouped API: Store access
		get storeApi() {
			return createStoreApiGetter<T, TQuery>().call(this);
		},

		// Grouped API: Event names
		get events() {
			return createEventsGetter<T, TQuery>({
				...config,
				namespace,
				name: resourceName,
			}).call(this);
		},
	};

	return resource;
}
