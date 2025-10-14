/**
 * Tests for custom identifier strategies in resource stores.
 */

import { createStore } from '../../store';
import type { ResourceObject, ListResponse } from '../../types';
import { createNoopReporter } from '../../../reporter';

// Helper to collect actions from resolver generators
async function collectActionsFromResolver(
	generator: Generator<unknown, void, unknown>
): Promise<unknown[]> {
	const actions: unknown[] = [];
	let result = generator.next();
	while (!result.done) {
		const value = result.value;
		actions.push(value);
		if (
			value &&
			typeof value === 'object' &&
			'promise' in (value as { promise?: unknown }) &&
			(value as { promise?: unknown }).promise instanceof Promise
		) {
			try {
				const resolved = await (value as { promise: Promise<unknown> })
					.promise;
				result = generator.next(resolved);
			} catch (error) {
				result = generator.throw(error);
			}
		} else {
			result = generator.next();
		}
	}
	return actions;
}

interface Article {
	slug: string;
	title: string;
}

interface ArticleQuery {
	category?: string;
}

describe('resource store identifier strategies', () => {
	let slugResource: ResourceObject<Article, ArticleQuery>;
	let listResponse: ListResponse<Article>;

	beforeEach(() => {
		listResponse = {
			items: [
				{ slug: 'article-one', title: 'Article One' },
				{ slug: 'article-two', title: 'Article Two' },
			],
			total: 2,
			hasMore: false,
			nextCursor: undefined,
		};

		slugResource = {
			name: 'article',
			storeKey: 'wpk/article',
			reporter: createNoopReporter(),
			cacheKeys: {
				list: (query?: unknown) => [
					'article',
					'list',
					(query as ArticleQuery | undefined)?.category ?? 'all',
				],
				get: (slug?: unknown) => [
					'article',
					'get',
					slug as string | number | undefined,
				],
				create: () => ['article', 'create'],
				update: (slug?: unknown) => [
					'article',
					'update',
					slug as string | number | undefined,
				],
				remove: (slug?: unknown) => [
					'article',
					'remove',
					slug as string | number | undefined,
				],
			},
			routes: {
				list: { path: '/my-plugin/v1/articles', method: 'GET' },
				get: { path: '/my-plugin/v1/articles/:slug', method: 'GET' },
				create: { path: '/my-plugin/v1/articles', method: 'POST' },
				update: { path: '/my-plugin/v1/articles/:slug', method: 'PUT' },
				remove: {
					path: '/my-plugin/v1/articles/:slug',
					method: 'DELETE',
				},
			},
			fetchList: jest.fn().mockResolvedValue(listResponse),
			fetch: jest.fn().mockResolvedValue(listResponse.items[0]),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			useGet: jest.fn(),
			useList: jest.fn(),
			prefetchGet: jest.fn().mockResolvedValue(undefined),
			prefetchList: jest.fn().mockResolvedValue(undefined),
			invalidate: jest.fn(),
			key: jest.fn(
				(
					operation: 'list' | 'get' | 'create' | 'update' | 'remove',
					params?: unknown
				) => {
					const result = slugResource.cacheKeys[operation]?.(
						params as never
					);
					return (result ?? []).filter(
						(value): value is string | number | boolean =>
							value !== null && value !== undefined
					);
				}
			),
			store: {},
			select: {
				item: jest.fn(),
				items: jest.fn(),
				list: jest.fn(),
			},
			get: {
				item: jest.fn(),
				list: jest.fn(),
			},
			mutate: {
				create: jest.fn(),
				update: jest.fn(),
				remove: jest.fn(),
			},
			cache: {
				prefetch: {
					item: jest.fn(),
					list: jest.fn(),
				},
				invalidate: {
					item: jest.fn(),
					list: jest.fn(),
					all: jest.fn(),
				},
				key: jest.fn(),
			},
			storeApi: {
				key: 'wpk/article',
				descriptor: {},
			},
			events: {
				created: 'wpk.article.created',
				updated: 'wpk.article.updated',
				removed: 'wpk.article.removed',
			},
		};
	});

	describe('selectors with slug identifiers', () => {
		it('indexes items and queries by slug', () => {
			const store = createStore<Article, ArticleQuery>({
				resource: slugResource,
				getId: (item) => item.slug,
				getQueryKey: (query) => `category:${query?.category ?? 'all'}`,
				initialState: {
					items: {
						'seed-article': {
							slug: 'seed-article',
							title: 'Seed Article',
						},
					},
				},
			});

			const initialState = store.reducer(undefined, { type: '@@INIT' });
			const listState = store.reducer(
				initialState,
				store.actions.receiveItems(
					'category:featured',
					listResponse.items,
					{ total: listResponse.total, hasMore: listResponse.hasMore }
				)
			);

			expect(store.selectors.getItem(listState, 'article-two')).toEqual({
				slug: 'article-two',
				title: 'Article Two',
			});
			expect(
				store.selectors.getItems(listState, { category: 'featured' })
			).toEqual(listResponse.items);
			expect(
				store.selectors.getListStatus(listState, {
					category: 'featured',
				})
			).toBe('success');

			const cacheKey =
				slugResource.cacheKeys
					.list?.({ category: 'featured' })
					?.join(':') ?? 'article:list:category:featured';
			const errorState = store.reducer(
				listState,
				store.actions.receiveError(cacheKey, 'Failed to load')
			);
			expect(
				store.selectors.getListError(errorState, {
					category: 'featured',
				})
			).toBe('Failed to load');
		});
	});

	describe('resolvers with slug identifiers', () => {
		it('uses custom query keys when resolving lists', async () => {
			const store = createStore<Article, ArticleQuery>({
				resource: slugResource,
				getId: (item) => item.slug,
				getQueryKey: (query) => `category:${query?.category ?? 'all'}`,
			});

			const actions = await collectActionsFromResolver(
				store.resolvers.getItems({ category: 'news' })
			);

			expect(slugResource.fetchList).toHaveBeenCalledWith({
				category: 'news',
			});
			expect(actions[0]).toEqual({
				type: 'SET_LIST_STATUS',
				queryKey: 'category:news',
				status: 'loading',
			});
			expect(actions[2]).toEqual({
				type: 'RECEIVE_ITEMS',
				queryKey: 'category:news',
				items: listResponse.items,
				meta: {
					total: listResponse.total,
					hasMore: listResponse.hasMore,
					nextCursor: listResponse.nextCursor,
				},
			});
		});

		it('reports slug-based cache keys on errors', async () => {
			const store = createStore<Article, ArticleQuery>({
				resource: slugResource,
				getId: (item) => item.slug,
				getQueryKey: (query) => `category:${query?.category ?? 'all'}`,
			});

			(slugResource.fetch as jest.Mock).mockRejectedValue(
				new Error('Boom')
			);

			const actions = await collectActionsFromResolver(
				store.resolvers.getItem('article-two')
			);

			expect(actions).toContainEqual({
				type: 'RECEIVE_ERROR',
				cacheKey: 'article:get:article-two',
				error: 'Boom',
			});
		});
	});
});
