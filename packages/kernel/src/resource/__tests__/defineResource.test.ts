/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '@kernel/resource/defineResource';
import { KernelError } from '@kernel/errors';
import type { CacheKeyFn } from '@kernel/resource';
import type { ResourceStore } from '@kernel/resource/store/types';

// Type for window.wp mock in tests
interface WindowWithWp extends Window {
	wp?: {
		data?: {
			register?: (store: unknown) => void;
		};
	};
}

interface Thing {
	id: number;
	title: string;
	description: string;
}

interface ThingQuery {
	q?: string;
	page?: number;
}

describe('defineResource', () => {
	describe('config validation', () => {
		describe('name validation', () => {
			it('should throw DeveloperError when name is missing', () => {
				expect(() => {
					defineResource({
						name: '',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw DeveloperError with correct error code for missing name', () => {
				try {
					defineResource({
						name: '',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
					fail('Should have thrown');
				} catch (e) {
					expect(e).toBeInstanceOf(KernelError);
					const error = e as KernelError;
					expect(error.code).toBe('DeveloperError');
					expect(error.message).toContain('name');
				}
			});

			it('should reject uppercase names', () => {
				expect(() => {
					defineResource({
						name: 'Thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should reject names with spaces', () => {
				expect(() => {
					defineResource({
						name: 'my thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should reject names with underscores', () => {
				expect(() => {
					defineResource({
						name: 'my_thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).toThrow(KernelError);
			});

			it('should accept valid kebab-case names', () => {
				expect(() => {
					defineResource({
						name: 'my-thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept names with numbers', () => {
				expect(() => {
					defineResource({
						name: 'thing-123',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept single-word names', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});
		});

		describe('routes validation', () => {
			it('should throw when routes is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: undefined as never,
					});
				}).toThrow(KernelError);
			});

			it('should throw when routes is empty object', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {},
					});
				}).toThrow(KernelError);
			});

			it('should accept config with only list route', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept config with only get route', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							get: { path: '/wpk/v1/things/:id', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept config with all CRUD routes', () => {
				expect(() => {
					defineResource<Thing>({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
							get: { path: '/wpk/v1/things/:id', method: 'GET' },
							create: {
								path: '/wpk/v1/things',
								method: 'POST',
							},
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PUT',
							},
							remove: {
								path: '/wpk/v1/things/:id',
								method: 'DELETE',
							},
						},
					});
				}).not.toThrow();
			});

			it('should throw for invalid route name', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							fetch: { path: '/wpk/v1/things', method: 'GET' },
						} as never,
					});
				}).toThrow(KernelError);
			});
		});

		describe('route definition validation', () => {
			it('should throw when route.path is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { method: 'GET' } as never,
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw when route.method is missing', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things' } as never,
						},
					});
				}).toThrow(KernelError);
			});

			it('should throw for invalid HTTP method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: {
								path: '/wpk/v1/things',
								method: 'FETCH' as never,
							},
						},
					});
				}).toThrow(KernelError);
			});

			it('should accept GET method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							list: { path: '/wpk/v1/things', method: 'GET' },
						},
					});
				}).not.toThrow();
			});

			it('should accept POST method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							create: {
								path: '/wpk/v1/things',
								method: 'POST',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept PUT method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PUT',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept PATCH method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							update: {
								path: '/wpk/v1/things/:id',
								method: 'PATCH',
							},
						},
					});
				}).not.toThrow();
			});

			it('should accept DELETE method', () => {
				expect(() => {
					defineResource({
						name: 'thing',
						routes: {
							remove: {
								path: '/wpk/v1/things/:id',
								method: 'DELETE',
							},
						},
					});
				}).not.toThrow();
			});
		});
	});

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

	describe('client method generation', () => {
		it('should generate list method when list route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.list).toBeDefined();
			expect(typeof resource.list).toBe('function');
		});

		it('should not generate list method when list route is not defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.list).toBeUndefined();
		});

		it('should generate get method when get route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.get).toBeDefined();
			expect(typeof resource.get).toBe('function');
		});

		it('should generate create method when create route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			expect(resource.create).toBeDefined();
			expect(typeof resource.create).toBe('function');
		});

		it('should generate update method when update route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					update: {
						path: '/wpk/v1/things/:id',
						method: 'PUT',
					},
				},
			});

			expect(resource.update).toBeDefined();
			expect(typeof resource.update).toBe('function');
		});

		it('should generate remove method when remove route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					remove: {
						path: '/wpk/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			expect(resource.remove).toBeDefined();
			expect(typeof resource.remove).toBe('function');
		});

		it('should generate all methods for full CRUD config', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					create: { path: '/wpk/v1/things', method: 'POST' },
					update: {
						path: '/wpk/v1/things/:id',
						method: 'PUT',
					},
					remove: {
						path: '/wpk/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			expect(resource.list).toBeDefined();
			expect(resource.get).toBeDefined();
			expect(resource.create).toBeDefined();
			expect(resource.update).toBeDefined();
			expect(resource.remove).toBeDefined();
		});
	});

	describe('client method stubs (write methods - NotImplementedError)', () => {
		it('should throw NotImplementedError when create is called', async () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			await expect(resource.create!({ title: 'Test' })).rejects.toThrow(
				KernelError
			);
		});

		it('should throw NotImplementedError when update is called', async () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					update: {
						path: '/wpk/v1/things/:id',
						method: 'PUT',
					},
				},
			});

			await expect(
				resource.update!(123, { title: 'Updated' })
			).rejects.toThrow(KernelError);
		});

		it('should throw NotImplementedError when remove is called', async () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					remove: {
						path: '/wpk/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			await expect(resource.remove!(123)).rejects.toThrow(KernelError);
		});

		it('should include correct error code in NotImplementedError', async () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			try {
				await resource.create!({ title: 'Test' });
				fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(KernelError);
				const error = e as KernelError;
				expect(error.code).toBe('NotImplementedError');
			}
		});
	});

	describe('lazy store initialization', () => {
		it('should have a store property', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource).toHaveProperty('store');
		});

		it('should return same store instance on multiple accesses', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const store1 = resource.store;
			const store2 = resource.store;

			expect(store1).toBe(store2);
		});

		it('should create store with correct storeKey', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const store = resource.store as ResourceStore<Thing, ThingQuery>;

			expect(store).toHaveProperty('storeKey', 'wpk/thing');
		});

		it('should create store with selectors, actions, resolvers, reducer', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const store = resource.store as ResourceStore<Thing, ThingQuery>;

			expect(store).toHaveProperty('selectors');
			expect(store).toHaveProperty('actions');
			expect(store).toHaveProperty('resolvers');
			expect(store).toHaveProperty('reducer');
			expect(store).toHaveProperty('initialState');
		});

		it('should not register store when window.wp.data is undefined', () => {
			// Mock scenario where window.wp is not available
			const windowWithWp = global.window as WindowWithWp;
			const originalWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Should still return store descriptor without throwing
			const store = resource.store as ResourceStore<Thing, ThingQuery>;
			expect(store).toHaveProperty('storeKey');

			// Restore
			if (windowWithWp && originalWp) {
				windowWithWp.wp = originalWp;
			}
		});

		it('should register store when window.wp.data.register is available', () => {
			// Mock window.wp.data.register
			const mockRegister = jest.fn();
			const windowWithWp = global.window as WindowWithWp;
			const originalWp = windowWithWp?.wp;

			if (windowWithWp) {
				windowWithWp.wp = {
					data: {
						register: mockRegister,
					},
				};
			}

			const resource = defineResource<Thing>({
				name: 'thing-with-register',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Access store to trigger registration
			const store = resource.store;

			if (windowWithWp?.wp?.data?.register) {
				expect(mockRegister).toHaveBeenCalledTimes(1);
				expect(mockRegister).toHaveBeenCalledWith(store);
			}

			// Restore
			if (windowWithWp) {
				if (originalWp) {
					windowWithWp.wp = originalWp;
				} else {
					delete windowWithWp.wp;
				}
			}
		});
	});

	describe('client methods', () => {
		let mockApiFetch: jest.Mock;
		let mockDoAction: jest.Mock;

		beforeEach(() => {
			// Mock @wordpress/api-fetch and hooks
			mockApiFetch = jest.fn();
			mockDoAction = jest.fn();

			const windowWithWp = global.window as any;

			if (windowWithWp) {
				windowWithWp.wp = {
					apiFetch: mockApiFetch,
					hooks: {
						doAction: mockDoAction,
					},
					data: {
						register: jest.fn(),
					},
				};
			}
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('list()', () => {
			it('should call transport.fetch() with correct parameters', async () => {
				const mockData = [
					{ id: 1, title: 'Thing 1', description: 'First' },
					{ id: 2, title: 'Thing 2', description: 'Second' },
				];
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing, ThingQuery>({
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				});

				const result = await resource.list!({ q: 'search', page: 1 });

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/wpk/v1/things?q=search&page=1',
					method: 'GET',
					data: undefined,
					parse: true,
				});
				expect(result.items).toEqual(mockData);
			});

			it('should normalize array response to ListResponse format', async () => {
				const mockData = [
					{ id: 1, title: 'Thing 1', description: 'First' },
				];
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				});

				const result = await resource.list!();

				expect(result).toEqual({
					items: mockData,
					total: undefined,
					hasMore: undefined,
					nextCursor: undefined,
				});
			});

			it('should handle object response with items property', async () => {
				const mockResponse = {
					items: [{ id: 1, title: 'Thing 1', description: 'First' }],
					total: 10,
					hasMore: true,
					nextCursor: 'cursor_abc123',
				};
				mockApiFetch.mockResolvedValue(mockResponse);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				});

				const result = await resource.list!();

				expect(result).toEqual(mockResponse);
			});
		});

		describe('get()', () => {
			it('should call transport.fetch() with interpolated path', async () => {
				const mockData = {
					id: 123,
					title: 'Thing 123',
					description: 'Test',
				};
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				});

				const result = await resource.get!(123);

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/wpk/v1/things/123',
					method: 'GET',
					data: undefined,
					parse: true,
				});
				expect(result).toEqual(mockData);
			});

			it('should handle string IDs', async () => {
				const mockData = {
					id: 'abc',
					title: 'Thing ABC',
					description: 'Test',
				};
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				});

				await resource.get!('abc');

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/wpk/v1/things/abc',
					method: 'GET',
					data: undefined,
					parse: true,
				});
			});
		});

		describe('error handling', () => {
			it('should propagate transport errors', async () => {
				const mockError = {
					code: 'rest_not_found',
					message: 'Resource not found',
					data: { status: 404 },
				};
				mockApiFetch.mockRejectedValue(mockError);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				});

				await expect(resource.get!(999)).rejects.toThrow(KernelError);
			});
		});
	});
});
