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
 * @param config - Validated resource configuration
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
	config: ResourceConfig<T, TQuery>
): ResourceClient<T, TQuery> {
	const client: ResourceClient<T, TQuery> = {};

	// fetchList method - GET collection
	if (config.routes.list) {
		client.fetchList = async (query?: TQuery): Promise<ListResponse<T>> => {
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

	// fetch method - GET single item by ID
	if (config.routes.get) {
		client.fetch = async (id: string | number): Promise<T> => {
			const path = interpolatePath(config.routes.get!.path, { id });

			const response = await transportFetch<T>({
				path,
				method: 'GET',
			});

			return response.data;
		};
	}

	// Create method - POST new item
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

	// Update method - PUT/PATCH existing item
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

	// Remove method - DELETE item by ID
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
