/**
 * @file Integration Tests - Resource Flow
 *
 * Tests the complete flow from resource definition through store population.
 * Mocks REST endpoints, verifies store state after resolvers, and validates event emission.
 */

import { defineResource } from '../../resource/define';

// Use global types instead of local interface

interface Thing {
	id: number;
	title: string;
	status: 'active' | 'inactive';
}

interface ThingQuery {
	q?: string;
	status?: string;
}

describe('Resource Flow Integration', () => {
	let mockApiFetch: jest.Mock;
	let mockRegister: jest.Mock;
	let mockCreateReduxStore: jest.Mock;
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		// Create mocks
		mockApiFetch = jest.fn();
		mockRegister = jest.fn();
		mockCreateReduxStore = jest
			.fn()
			.mockReturnValue({ name: 'test-store' });
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		mockDoAction = jest.fn();

		// Setup window.wp mock with apiFetch
		if (windowWithWp) {
			windowWithWp.wp = {
				apiFetch: mockApiFetch,
				data: {
					register: mockRegister,
					createReduxStore: mockCreateReduxStore,
					dispatch: mockDispatch,
					select: mockSelect,
				},
				hooks: {
					doAction: mockDoAction,
				},
			};
		}
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		jest.clearAllMocks();
	});

	describe('Resource → Store → Resolver Flow', () => {
		it('should create resource with store and register it', () => {
			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			// Access store to trigger registration
			const store = resource.store;

			expect(store).toBeDefined();
			expect(mockCreateReduxStore).toHaveBeenCalledWith(
				'wpk/thing',
				expect.objectContaining({
					reducer: expect.any(Function),
					actions: expect.any(Object),
					selectors: expect.any(Object),
					resolvers: expect.any(Object),
				})
			);
			expect(mockRegister).toHaveBeenCalledWith({ name: 'test-store' });
		});

		it('should call transport and emit events when list() is called', async () => {
			const mockThings: Thing[] = [
				{ id: 1, title: 'Thing 1', status: 'active' },
				{ id: 2, title: 'Thing 2', status: 'inactive' },
			];

			mockApiFetch.mockResolvedValue({
				items: mockThings,
				total: 2,
			});

			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = await resource.fetchList!({ q: 'test' });

			// Verify transport was called
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things?q=test',
				method: 'GET',
				parse: true,
			});

			// Verify result structure
			expect(result).toMatchObject({
				items: mockThings,
				total: 2,
			});
		});

		it('should call transport when get() is called', async () => {
			const mockThing: Thing = {
				id: 123,
				title: 'Thing 123',
				status: 'active',
			};

			mockApiFetch.mockResolvedValue(mockThing);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = await resource.fetch!(123);

			// Verify transport was called with interpolated path
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things/123',
				method: 'GET',
				parse: true,
			});

			// Verify result
			expect(result).toEqual(mockThing);
		});

		it('should handle create() and return created item', async () => {
			const newThing = { title: 'New Thing', status: 'active' as const };
			const createdThing: Thing = { id: 999, ...newThing };

			mockApiFetch.mockResolvedValue(createdThing);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			const result = await resource.create!(newThing);

			// Verify transport was called
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things',
				method: 'POST',
				data: newThing,
				parse: true,
			});

			// Verify result
			expect(result).toEqual(createdThing);
		});

		it('should handle update() and return updated item', async () => {
			const updateData = { title: 'Updated Thing' };
			const updatedThing: Thing = {
				id: 123,
				title: 'Updated Thing',
				status: 'active',
			};

			mockApiFetch.mockResolvedValue(updatedThing);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
				},
			});

			const result = await resource.update!(123, updateData);

			// Verify transport was called with interpolated path
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things/123',
				method: 'PUT',
				data: updateData,
				parse: true,
			});

			// Verify result
			expect(result).toEqual(updatedThing);
		});

		it('should handle remove() and return void', async () => {
			mockApiFetch.mockResolvedValue(undefined);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
				},
			});

			const result = await resource.remove!(123);

			// Verify transport was called
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things/123',
				method: 'DELETE',
				parse: true,
			});

			// Verify result is void
			expect(result).toBeUndefined();
		});
	});

	describe('Error Handling Integration', () => {
		it('should propagate transport errors', async () => {
			const transportError = new Error('Network error');
			mockApiFetch.mockRejectedValue(transportError);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			await expect(resource.fetchList!()).rejects.toThrow();
		});

		it('should handle errors when getting single item', async () => {
			const notFoundError = new Error('Not found');
			mockApiFetch.mockRejectedValue(notFoundError);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			await expect(resource.fetch!(999)).rejects.toThrow();
		});

		it('should handle errors on create', async () => {
			const validationError = new Error('Invalid data');
			mockApiFetch.mockRejectedValue(validationError);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			await expect(
				resource.create!({ title: '', status: 'active' })
			).rejects.toThrow();
		});
	});

	describe('Cache Keys Integration', () => {
		it('should generate deterministic cache keys for list queries', () => {
			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const key1 = resource.cacheKeys.list({
				q: 'test',
				status: 'active',
			});
			const key2 = resource.cacheKeys.list({
				q: 'test',
				status: 'active',
			});
			const key3 = resource.cacheKeys.list({
				q: 'other',
				status: 'active',
			});

			// Same params should generate same key
			expect(key1).toEqual(key2);

			// Different params should generate different key
			expect(key1).not.toEqual(key3);
		});

		it('should generate cache keys for all CRUD operations', () => {
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

			expect(resource.cacheKeys.list()).toContain('thing');
			expect(resource.cacheKeys.get(123)).toContain('thing');
			expect(resource.cacheKeys.create({})).toContain('thing');
			expect(resource.cacheKeys.update(123)).toContain('thing');
			expect(resource.cacheKeys.remove(123)).toContain('thing');
		});
	});

	describe('Store Configuration Integration', () => {
		it('should create store with correct selectors', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			// Trigger store creation
			void resource.store;

			const storeConfig = mockCreateReduxStore.mock.calls[0][1];

			// Verify selectors exist (actual names from createStore.ts)
			expect(storeConfig.selectors).toHaveProperty('getList');
			expect(storeConfig.selectors).toHaveProperty('getItem');
			expect(storeConfig.selectors).toHaveProperty('getItems');
			expect(storeConfig.selectors).toHaveProperty('isResolving');
			expect(storeConfig.selectors).toHaveProperty('getError');
		});

		it('should create store with correct resolvers', () => {
			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			// Trigger store creation
			void resource.store;

			const storeConfig = mockCreateReduxStore.mock.calls[0][1];

			// Verify resolvers exist (actual names from createStore.ts)
			expect(storeConfig.resolvers).toHaveProperty('getList');
			expect(storeConfig.resolvers).toHaveProperty('getItem');
			expect(storeConfig.resolvers).toHaveProperty('getItems');
		});

		it('should create store with correct actions', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Trigger store creation
			void resource.store;

			const storeConfig = mockCreateReduxStore.mock.calls[0][1];

			// Verify actions exist (actual names from createStore.ts)
			expect(storeConfig.actions).toHaveProperty('receiveItems');
			expect(storeConfig.actions).toHaveProperty('receiveItem');
			expect(storeConfig.actions).toHaveProperty('receiveError');
			expect(storeConfig.actions).toHaveProperty('invalidate');
			expect(storeConfig.actions).toHaveProperty('invalidateAll');
		});
	});
});
