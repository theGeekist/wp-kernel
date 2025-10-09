/**
 * Resource client factory
 *
 * Creates typed REST client methods from resource configuration.
 * Each method corresponds to a configured route and handles
 * request/response transformation.
 *
 * @see Product Specification § 4.1 Resources
 */
import { fetch as transportFetch } from '../http/fetch';
import { interpolatePath } from './cache';
import type { ResourceConfig, ResourceClient, ListResponse } from './types';
import type { Reporter } from '../reporter';
import { createNoopReporter } from '../reporter';

const CLIENT_LOG_MESSAGES = {
	fetchListStart: 'resource.client.fetchList.start',
	fetchListSuccess: 'resource.client.fetchList.success',
	fetchListError: 'resource.client.fetchList.error',
	fetchStart: 'resource.client.fetch.start',
	fetchSuccess: 'resource.client.fetch.success',
	fetchError: 'resource.client.fetch.error',
	createStart: 'resource.client.create.start',
	createSuccess: 'resource.client.create.success',
	createError: 'resource.client.create.error',
	updateStart: 'resource.client.update.start',
	updateSuccess: 'resource.client.update.success',
	updateError: 'resource.client.update.error',
	removeStart: 'resource.client.remove.start',
	removeSuccess: 'resource.client.remove.success',
	removeError: 'resource.client.remove.error',
} as const;

/**
 * Create resource client
 *
 * Generates typed REST client methods based on configured routes.
 * Only creates methods for routes that are defined in the config.
 *
 * Supported routes:
 * - `list`: GET collection with optional query parameters → `fetchList()`
 * - `get`: GET single item by ID → `fetch()`
 * - `create`: POST new item → `create()`
 * - `update`: PUT/PATCH existing item → `update()`
 * - `remove`: DELETE item by ID → `remove()`
 *
 * @param config   - Validated resource configuration
 * @param reporter
 * @return Resource client with typed methods
 *
 * @example
 * ```ts
 * const client = createClient({
 *   name: 'testimonial',
 *   routes: {
 *     list: { path: '/my-plugin/v1/testimonials', method: 'GET' },
 *     get: { path: '/my-plugin/v1/testimonials/:id', method: 'GET' }
 *   }
 * });
 *
 * const { items } = await client.fetchList({ search: 'excellent' });
 * const item = await client.fetch(123);
 * ```
 */
export function createClient<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	reporter?: Reporter
): ResourceClient<T, TQuery> {
	const client: ResourceClient<T, TQuery> = {};
	const clientReporter = (reporter ?? createNoopReporter()).child('client');

	// fetchList method - GET collection
	if (config.routes.list) {
		client.fetchList = async (query?: TQuery): Promise<ListResponse<T>> => {
			const fetchListReporter = clientReporter.child('fetchList');
			fetchListReporter.debug(CLIENT_LOG_MESSAGES.fetchListStart, {
				resource: config.name,
				query,
				route: config.routes.list?.path,
			});

			try {
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

				const normalized = {
					items,
					total: response.data.total,
					hasMore: response.data.hasMore,
					nextCursor: response.data.nextCursor,
				};

				fetchListReporter.info(CLIENT_LOG_MESSAGES.fetchListSuccess, {
					resource: config.name,
					query,
					count: normalized.items.length,
					total: normalized.total,
					hasMore: normalized.hasMore,
				});

				return normalized;
			} catch (error) {
				fetchListReporter.error(CLIENT_LOG_MESSAGES.fetchListError, {
					resource: config.name,
					query,
					route: config.routes.list?.path,
					error:
						error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		};
	}

	// fetch method - GET single item by ID
	if (config.routes.get) {
		client.fetch = async (id: string | number): Promise<T> => {
			const fetchReporter = clientReporter.child('fetch');
			fetchReporter.debug(CLIENT_LOG_MESSAGES.fetchStart, {
				resource: config.name,
				id,
				route: config.routes.get?.path,
			});

			const path = interpolatePath(config.routes.get!.path, { id });

			try {
				const response = await transportFetch<T>({
					path,
					method: 'GET',
				});

				fetchReporter.info(CLIENT_LOG_MESSAGES.fetchSuccess, {
					resource: config.name,
					id,
				});

				return response.data;
			} catch (error) {
				fetchReporter.error(CLIENT_LOG_MESSAGES.fetchError, {
					resource: config.name,
					id,
					route: config.routes.get?.path,
					error:
						error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		};
	}

	// Create method - POST new item
	if (config.routes.create) {
		client.create = async (data: Partial<T>): Promise<T> => {
			const createReporter = clientReporter.child('create');
			createReporter.debug(CLIENT_LOG_MESSAGES.createStart, {
				resource: config.name,
				data,
				route: config.routes.create?.path,
			});

			try {
				const response = await transportFetch<T>({
					path: config.routes.create!.path,
					method: 'POST',
					data,
				});

				createReporter.info(CLIENT_LOG_MESSAGES.createSuccess, {
					resource: config.name,
					id: (response.data as { id?: string | number })?.id,
				});

				return response.data;
			} catch (error) {
				createReporter.error(CLIENT_LOG_MESSAGES.createError, {
					resource: config.name,
					data,
					route: config.routes.create?.path,
					error:
						error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		};
	}

	// Update method - PUT/PATCH existing item
	if (config.routes.update) {
		client.update = async (
			id: string | number,
			data: Partial<T>
		): Promise<T> => {
			const updateReporter = clientReporter.child('update');
			updateReporter.debug(CLIENT_LOG_MESSAGES.updateStart, {
				resource: config.name,
				id,
				data,
				route: config.routes.update?.path,
			});

			const path = interpolatePath(config.routes.update!.path, { id });

			try {
				const response = await transportFetch<T>({
					path,
					method: config.routes.update!.method as 'PUT' | 'PATCH',
					data,
				});

				updateReporter.info(CLIENT_LOG_MESSAGES.updateSuccess, {
					resource: config.name,
					id,
				});

				return response.data;
			} catch (error) {
				updateReporter.error(CLIENT_LOG_MESSAGES.updateError, {
					resource: config.name,
					id,
					route: config.routes.update?.path,
					error:
						error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		};
	}

	// Remove method - DELETE item by ID
	if (config.routes.remove) {
		client.remove = async (id: string | number): Promise<void> => {
			const removeReporter = clientReporter.child('remove');
			removeReporter.debug(CLIENT_LOG_MESSAGES.removeStart, {
				resource: config.name,
				id,
				route: config.routes.remove?.path,
			});

			const path = interpolatePath(config.routes.remove!.path, { id });

			try {
				await transportFetch<void>({
					path,
					method: 'DELETE',
				});

				removeReporter.info(CLIENT_LOG_MESSAGES.removeSuccess, {
					resource: config.name,
					id,
				});
			} catch (error) {
				removeReporter.error(CLIENT_LOG_MESSAGES.removeError, {
					resource: config.name,
					id,
					route: config.routes.remove?.path,
					error:
						error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		};
	}

	return client;
}
