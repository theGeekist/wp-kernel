/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import { KernelError } from '../../error';
import type { ResourceStore } from '../types';

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

describe('defineResource - integration', () => {
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
			// Mock window.wp.data.createReduxStore and register
			const mockCreatedStore = { name: 'mock-redux-store' };
			const mockCreateReduxStore = jest
				.fn()
				.mockReturnValue(mockCreatedStore);
			const mockRegister = jest.fn();
			const windowWithWp = global.window as WindowWithWp;
			const originalWp = windowWithWp?.wp;

			if (windowWithWp) {
				windowWithWp.wp = {
					data: {
						createReduxStore: mockCreateReduxStore,
						register: mockRegister,
					} as any,
				};
			}

			const resource = defineResource<Thing>({
				name: 'thing-with-register',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Access store to trigger registration
			void resource.store;

			if (windowWithWp?.wp?.data?.register) {
				expect(mockCreateReduxStore).toHaveBeenCalledTimes(1);
				expect(mockCreateReduxStore).toHaveBeenCalledWith(
					'wpk/thing-with-register',
					expect.objectContaining({
						reducer: expect.any(Function),
						actions: expect.any(Object),
						selectors: expect.any(Object),
						resolvers: expect.any(Object),
					})
				);
				expect(mockRegister).toHaveBeenCalledTimes(1);
				expect(mockRegister).toHaveBeenCalledWith(mockCreatedStore);
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

				const result = await resource.fetchList!({
					q: 'search',
					page: 1,
				});

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

				const result = await resource.fetchList!();

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

				const result = await resource.fetchList!();

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

				const result = await resource.fetch!(123);

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

				await resource.fetch!('abc');

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

				await expect(resource.fetch!(999)).rejects.toThrow(KernelError);
			});
		});
	});
});
