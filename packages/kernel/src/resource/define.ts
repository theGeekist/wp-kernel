/**
 * Resource definition and client generation
 *
 * Core function for declaring typed REST resources with automatic
 * client methods, store keys, and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import type * as WPData from '@wordpress/data';
import { KernelError } from '../error/index.js';
import {
	interpolatePath,
	registerStoreKey,
	invalidate as globalInvalidate,
} from './cache.js';
import { createStore } from './store.js';
import { fetch as transportFetch } from '../http/fetch.js';
import type {
	ResourceConfig,
	ResourceObject,
	ResourceClient,
	ListResponse,
	CacheKeys,
} from './types.js';

type WPGlobal = { wp?: { data?: typeof WPData } };

/**
 * Default cache key generators
 *
 * Used when custom cacheKeys are not provided in config
 * @param resourceName
 */
function createDefaultCacheKeys(resourceName: string): Required<CacheKeys> {
	return {
		list: (query) => [resourceName, 'list', JSON.stringify(query || {})],
		get: (id) => [resourceName, 'get', id],
		create: (data) => [resourceName, 'create', JSON.stringify(data || {})],
		update: (id) => [resourceName, 'update', id],
		remove: (id) => [resourceName, 'remove', id],
	};
}

/**
 * Validate resource configuration
 *
 * Throws DeveloperError for invalid configs to catch issues at dev time
 *
 * @param config - Resource configuration to validate
 * @throws DeveloperError if configuration is invalid
 */
function validateConfig<T, TQuery>(config: ResourceConfig<T, TQuery>): void {
	// Validate name
	if (!config.name || typeof config.name !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'Resource config must have a valid "name" property',
			data: {
				validationErrors: [
					{
						field: 'name',
						message: 'Required string property',
					},
				],
			},
		});
	}

	if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
		throw new KernelError('DeveloperError', {
			message: `Resource name "${config.name}" must be lowercase with hyphens only (kebab-case)`,
			data: {
				validationErrors: [
					{
						field: 'name',
						message:
							'Must match pattern: lowercase letters, numbers, hyphens',
					},
				],
			},
		});
	}

	// Validate routes
	if (!config.routes || typeof config.routes !== 'object') {
		throw new KernelError('DeveloperError', {
			message: 'Resource config must have a "routes" object',
			data: {
				validationErrors: [
					{
						field: 'routes',
						message: 'Required object property',
					},
				],
			},
			context: { resourceName: config.name },
		});
	}

	// At least one route must be defined
	const routeKeys = Object.keys(config.routes);
	if (routeKeys.length === 0) {
		throw new KernelError('DeveloperError', {
			message: `Resource "${config.name}" must define at least one route`,
			data: {
				validationErrors: [
					{
						field: 'routes',
						message:
							'At least one route (list, get, create, update, remove) required',
					},
				],
			},
			context: { resourceName: config.name },
		});
	}

	// Validate each route definition
	const validRouteNames = ['list', 'get', 'create', 'update', 'remove'];
	for (const [routeName, route] of Object.entries(config.routes)) {
		if (!validRouteNames.includes(routeName)) {
			throw new KernelError('DeveloperError', {
				message: `Invalid route name "${routeName}" in resource "${config.name}"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}`,
							message: `Must be one of: ${validRouteNames.join(', ')}`,
							code: 'INVALID_ROUTE_NAME',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route || typeof route !== 'object') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must be an object`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}`,
							message: 'Must be an object with path and method',
							code: 'INVALID_ROUTE_TYPE',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route.path || typeof route.path !== 'string') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must have a valid "path"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.path`,
							message: 'Required string property',
							code: 'MISSING_PATH',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		if (!route.method || typeof route.method !== 'string') {
			throw new KernelError('DeveloperError', {
				message: `Route "${routeName}" in resource "${config.name}" must have a valid "method"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.method`,
							message:
								'Required string property (GET, POST, PUT, PATCH, DELETE)',
							code: 'MISSING_METHOD',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}

		const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
		if (!validMethods.includes(route.method)) {
			throw new KernelError('DeveloperError', {
				message: `Invalid HTTP method "${route.method}" for route "${routeName}" in resource "${config.name}"`,
				data: {
					validationErrors: [
						{
							field: `routes.${routeName}.method`,
							message: `Must be one of: ${validMethods.join(', ')}`,
							code: 'INVALID_METHOD',
						},
					],
				},
				context: { resourceName: config.name },
			});
		}
	}
}

/**
 * Create resource client
 *
 * Generates typed REST client methods based on configured routes.
 *
 * @param config - Validated resource configuration
 * @return Resource client with typed methods
 */
function createClient<T, TQuery>(
	config: ResourceConfig<T, TQuery>
): ResourceClient<T, TQuery> {
	const client: ResourceClient<T, TQuery> = {};

	// List method
	if (config.routes.list) {
		client.list = async (query?: TQuery): Promise<ListResponse<T>> => {
			const response = await transportFetch<{
				items?: T[];
				total?: number;
				hasMore?: boolean;
				nextCursor?: string;
			}>({
				path: config.routes.list!.path,
				method: 'GET',
				query: query as Record<string, unknown>,
			});

			// Normalize response to ListResponse format
			// Support both array responses and object responses with items property
			const items = Array.isArray(response.data)
				? response.data
				: response.data.items || [];

			return {
				items,
				total: response.data.total,
				hasMore: response.data.hasMore,
				nextCursor: response.data.nextCursor,
			};
		};
	}

	// Get method
	if (config.routes.get) {
		client.get = async (id: string | number): Promise<T> => {
			const path = interpolatePath(config.routes.get!.path, { id });

			const response = await transportFetch<T>({
				path,
				method: 'GET',
			});

			return response.data;
		};
	}

	// Create method
	if (config.routes.create) {
		client.create = async (data: Partial<T>): Promise<T> => {
			const response = await transportFetch<T>({
				path: config.routes.create!.path,
				method: 'POST',
				data,
			});

			return response.data;
		};
	}

	// Update method
	if (config.routes.update) {
		client.update = async (
			id: string | number,
			data: Partial<T>
		): Promise<T> => {
			const path = interpolatePath(config.routes.update!.path, { id });

			const response = await transportFetch<T>({
				path,
				method: config.routes.update!.method as 'PUT' | 'PATCH',
				data,
			});

			return response.data;
		};
	}

	// Remove method
	if (config.routes.remove) {
		client.remove = async (id: string | number): Promise<void> => {
			const path = interpolatePath(config.routes.remove!.path, { id });

			await transportFetch<void>({
				path,
				method: 'DELETE',
			});
		};
	}

	return client;
}

/**
 * Define a resource with typed REST client
 *
 * Creates a resource object with:
 * - Typed client methods (list, get, create, update, remove)
 * - Store key for @wordpress/data registration
 * - Cache key generators for invalidation
 * - Route definitions
 *
 * @template T - Resource entity type (e.g., Thing)
 * @template TQuery - Query parameters type for list operations (e.g., { q?: string })
 * @param    config - Resource configuration
 * @return Resource object with client methods and metadata
 * @throws DeveloperError if configuration is invalid
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/wpk/v1/things', method: 'GET' },
 *     get: { path: '/wpk/v1/things/:id', method: 'GET' },
 *     create: { path: '/wpk/v1/things', method: 'POST' }
 *   },
 *   cacheKeys: {
 *     list: (q) => ['thing', 'list', q?.q],
 *     get: (id) => ['thing', 'get', id]
 *   }
 * });
 *
 * // Use client methods
 * const items = await thing.list({ q: 'search' });
 * const item = await thing.get(123);
 *
 * // Use metadata
 * console.log(thing.storeKey); // 'wpk/thing'
 * invalidate(thing.cacheKeys.list({ q: 'search' }));
 * ```
 */
export function defineResource<T = unknown, TQuery = unknown>(
	config: ResourceConfig<T, TQuery>
): ResourceObject<T, TQuery> {
	// Validate configuration (throws on error)
	validateConfig(config);

	// Create client methods
	const client = createClient<T, TQuery>(config);

	// Create or use provided cache keys
	const cacheKeys: Required<CacheKeys> = {
		...createDefaultCacheKeys(config.name),
		...config.cacheKeys,
	};

	// Lazy store initialization
	let _store: unknown = null;
	let _storeRegistered = false;

	// Build resource object
	const resource: ResourceObject<T, TQuery> = {
		...client,
		name: config.name,
		storeKey: `wpk/${config.name}`,
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
						? (window as Window & WPGlobal).wp
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
							? (window as Window & WPGlobal).wp
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
							? (window as Window & WPGlobal).wp
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
							? (window as Window & WPGlobal).wp
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
							? (window as Window & WPGlobal).wp
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
			const generator = cacheKeys[operation];
			if (!generator) {
				throw new KernelError('DeveloperError', {
					message: `Cache key generator for operation '${operation}' not found`,
					context: {
						resource: config.name,
						operation,
						availableOperations: Object.keys(cacheKeys),
					},
				});
			}

			// Generate and return the cache key
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cacheKey = generator(params as any);

			// Filter out null and undefined values
			return cacheKey.filter(
				(v): v is string | number | boolean =>
					v !== null && v !== undefined
			);
		},
	};

	return resource;
}
