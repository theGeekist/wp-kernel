/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import type { CacheKeyFn } from '../../resource';

interface Thing {
	id: number;
	title: string;
	description: string;
}

interface ThingQuery {
	q?: string;
	page?: number;
}

describe('defineResource - resource object structure', () => {
	describe('resource object structure', () => {
		it('should include resource name', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.name).toBe('thing');
		});

		it('should generate correct store key', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.storeKey).toBe('wpk/thing');
		});

		it('should preserve routes', () => {
			const routes = {
				list: { path: '/wpk/v1/things', method: 'GET' as const },
				get: { path: '/wpk/v1/things/:id', method: 'GET' as const },
			};

			const resource = defineResource({
				name: 'thing',
				routes,
			});

			expect(resource.routes).toEqual(routes);
		});

		it('should generate default cache keys when not provided', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.cacheKeys.list).toBeDefined();
			expect(resource.cacheKeys.get).toBeDefined();
			expect(typeof resource.cacheKeys.list).toBe('function');
			expect(typeof resource.cacheKeys.get).toBe('function');
		});

		it('should generate all default cache keys for CRUD operations', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					create: { path: '/wpk/v1/things', method: 'POST' },
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
					remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
				},
			});

			// Test default cache key generators
			expect(resource.cacheKeys.list({ q: 'test' })).toEqual([
				'thing',
				'list',
				JSON.stringify({ q: 'test' }),
			]);

			expect(resource.cacheKeys.get(123)).toEqual(['thing', 'get', 123]);

			expect(
				resource.cacheKeys.create({
					title: 'New thing',
					description: 'Test',
				})
			).toEqual([
				'thing',
				'create',
				JSON.stringify({ title: 'New thing', description: 'Test' }),
			]);

			expect(resource.cacheKeys.update(456)).toEqual([
				'thing',
				'update',
				456,
			]);

			expect(resource.cacheKeys.remove(789)).toEqual([
				'thing',
				'remove',
				789,
			]);
		});

		it('should use custom cache keys when provided', () => {
			const customCacheKeys: {
				list: CacheKeyFn<ThingQuery>;
				get: CacheKeyFn<string | number>;
			} = {
				list: (q?: ThingQuery) => ['custom', 'list', q?.q],
				get: (id?: string | number) => ['custom', 'get', id],
			};

			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
				cacheKeys: customCacheKeys as never,
			});

			expect(resource.cacheKeys.list({ q: 'search' })).toEqual([
				'custom',
				'list',
				'search',
			]);
			expect(resource.cacheKeys.get(123)).toEqual(['custom', 'get', 123]);
		});

		it('should merge custom and default cache keys', () => {
			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
				cacheKeys: {
					list: ((q?: ThingQuery) => [
						'custom',
						'list',
						q?.q,
					]) as CacheKeyFn<ThingQuery>,
					// get uses default
				} as never,
			});

			// Custom list cache key
			expect(resource.cacheKeys.list({ q: 'search' })).toEqual([
				'custom',
				'list',
				'search',
			]);

			// Default get cache key
			const getKey = resource.cacheKeys.get(123);
			expect(getKey[0]).toBe('thing');
			expect(getKey[1]).toBe('get');
			expect(getKey[2]).toBe(123);
		});
	});
});

import { getWPData } from '../utils.js';

describe('utils - getWPData', () => {
	beforeEach(() => {
		// Clear any existing wp.data
		delete (window as typeof window & { wp?: Record<string, unknown> }).wp;
	});

	it('should return wp.data when available', () => {
		const mockWPData = {
			select: jest.fn(),
			dispatch: jest.fn(),
			subscribe: jest.fn(),
		};

		(window as typeof window & { wp: { data: typeof mockWPData } }).wp = {
			data: mockWPData,
		};

		const result = getWPData();
		expect(result).toBe(mockWPData);
	});

	it('should return undefined when wp is not available', () => {
		delete (window as typeof window & { wp?: Record<string, unknown> }).wp;

		const result = getWPData();
		expect(result).toBeUndefined();
	});

	it('should return undefined when wp.data is not available', () => {
		(window as typeof window & { wp: Record<string, unknown> }).wp = {};

		const result = getWPData();
		expect(result).toBeUndefined();
	});

	it('should handle partial wp object', () => {
		(
			window as typeof window & { wp: { hooks: Record<string, unknown> } }
		).wp = {
			hooks: {},
			// data is missing
		};

		const result = getWPData();
		expect(result).toBeUndefined();
	});
});
