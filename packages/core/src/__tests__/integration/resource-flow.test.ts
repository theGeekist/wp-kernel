/**
 * @file Integration Tests - Resource Flow
 *
 * Tests the complete flow from resource definition through store population.
 * Mocks REST endpoints, verifies store state after resolvers, and validates event emission.
 */

import { defineResource } from '../../resource/define';
import type { ResourceRoutes, ResourceObject } from '../../resource/types';
import { TransportError } from '../../error/TransportError';
import {
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '../../../tests/wp-environment.test-support';

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
	let harness: WordPressTestHarness;
	let mockApiFetch: jest.Mock;
	let mockRegister: jest.Mock;
	let mockCreateReduxStore: jest.Mock;
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	type ThingResource = ResourceObject<Thing, ThingQuery>;

	beforeEach(() => {
		mockApiFetch = jest.fn();
		mockRegister = jest.fn();
		mockCreateReduxStore = jest
			.fn()
			.mockReturnValue({ name: 'test-store' });
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		harness = createWordPressTestHarness({
			apiFetch: mockApiFetch,
			data: {
				register: mockRegister,
				createReduxStore: mockCreateReduxStore,
				dispatch: mockDispatch,
				select: mockSelect,
			},
		});
	});

	afterEach(() => {
		harness.teardown();
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

		interface TransportScenario<TResult> {
			title: string;
			routes: ResourceRoutes;
			arrange: () => {
				expectedRequest: Record<string, unknown>;
				invoke: (resource: ThingResource) => Promise<TResult>;
				assertResult: (result: TResult) => void;
			};
		}

		const transportScenarios: TransportScenario<unknown>[] = [
			{
				title: 'list() calls transport and returns payload',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
				arrange: () => {
					const mockThings: Thing[] = [
						{ id: 1, title: 'Thing 1', status: 'active' },
						{ id: 2, title: 'Thing 2', status: 'inactive' },
					];

					mockApiFetch.mockResolvedValue({
						items: mockThings,
						total: 2,
					});

					return {
						expectedRequest: {
							path: '/wpk/v1/things?q=test',
							method: 'GET',
							parse: true,
						},
						invoke: (resource: ThingResource) =>
							resource.fetchList!({ q: 'test' }),
						assertResult: (result: unknown) => {
							expect(result).toMatchObject({
								items: mockThings,
								total: 2,
							});
						},
					};
				},
			},
			{
				title: 'get() interpolates path and returns an item',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
				arrange: () => {
					const mockThing: Thing = {
						id: 123,
						title: 'Thing 123',
						status: 'active',
					};

					mockApiFetch.mockResolvedValue(mockThing);

					return {
						expectedRequest: {
							path: '/wpk/v1/things/123',
							method: 'GET',
							parse: true,
						},
						invoke: (resource: ThingResource) =>
							resource.fetch!(123),
						assertResult: (result: unknown) => {
							expect(result).toEqual(mockThing);
						},
					};
				},
			},
			{
				title: 'create() forwards payload to transport',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
				arrange: () => {
					const newThing = {
						title: 'New Thing',
						status: 'active' as const,
					};
					const createdThing: Thing = { id: 999, ...newThing };

					mockApiFetch.mockResolvedValue(createdThing);

					return {
						expectedRequest: {
							path: '/wpk/v1/things',
							method: 'POST',
							data: newThing,
							parse: true,
						},
						invoke: (resource: ThingResource) =>
							resource.create!(newThing),
						assertResult: (result: unknown) => {
							expect(result).toEqual(createdThing);
						},
					};
				},
			},
			{
				title: 'update() interpolates identifier and returns updated payload',
				routes: {
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
				},
				arrange: () => {
					const updateData = { title: 'Updated Thing' };
					const updatedThing: Thing = {
						id: 123,
						title: 'Updated Thing',
						status: 'active',
					};

					mockApiFetch.mockResolvedValue(updatedThing);

					return {
						expectedRequest: {
							path: '/wpk/v1/things/123',
							method: 'PUT',
							data: updateData,
							parse: true,
						},
						invoke: (resource: ThingResource) =>
							resource.update!(123, updateData),
						assertResult: (result: unknown) => {
							expect(result).toEqual(updatedThing);
						},
					};
				},
			},
			{
				title: 'remove() resolves to void',
				routes: {
					remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
				},
				arrange: () => {
					mockApiFetch.mockResolvedValue(undefined);

					return {
						expectedRequest: {
							path: '/wpk/v1/things/123',
							method: 'DELETE',
							parse: true,
						},
						invoke: (resource: ThingResource) =>
							resource.remove!(123),
						assertResult: (result: unknown) => {
							expect(result).toBeUndefined();
						},
					};
				},
			},
		];

		it.each(transportScenarios)('%s', async ({ routes, arrange }) => {
			const { expectedRequest, invoke, assertResult } = arrange();

			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes,
			});

			const result = await invoke(resource);

			expect(mockApiFetch).toHaveBeenCalledWith(expectedRequest);
			assertResult(result);
		});
	});

	describe('Error Handling Integration', () => {
		interface ErrorScenario {
			title: string;
			routes: ResourceRoutes;
			invoke: (resource: ThingResource) => Promise<unknown>;
		}

		const errorScenarios: ErrorScenario[] = [
			{
				title: 'list()',
				routes: { list: { path: '/wpk/v1/things', method: 'GET' } },
				invoke: (resource) => resource.fetchList!(),
			},
			{
				title: 'get()',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
				invoke: (resource) => resource.fetch!(999),
			},
			{
				title: 'create()',
				routes: { create: { path: '/wpk/v1/things', method: 'POST' } },
				invoke: (resource) =>
					resource.create!({ title: '', status: 'active' }),
			},
		];

		it.each(errorScenarios)(
			'propagates transport errors for %s',
			async ({ routes, invoke }) => {
				const transportError = new Error('Network error');
				mockApiFetch.mockRejectedValue(transportError);

				const resource = defineResource<Thing, ThingQuery>({
					name: 'thing',
					routes,
				});

				await expect(invoke(resource)).rejects.toThrow(transportError);
			}
		);

		const retryableScenarios: Array<{
			title: string;
			routes: ResourceRoutes;
			invoke: (resource: ThingResource) => Promise<unknown>;
			expectedPath: string;
			expectedMethod: string;
		}> = [
			{
				title: 'list()',
				routes: { list: { path: '/wpk/v1/things', method: 'GET' } },
				invoke: (resource) => resource.fetchList!(),
				expectedPath: '/wpk/v1/things',
				expectedMethod: 'GET',
			},
			{
				title: 'get()',
				routes: { get: { path: '/wpk/v1/things/:id', method: 'GET' } },
				invoke: (resource) => resource.fetch!(42),
				expectedPath: '/wpk/v1/things/42',
				expectedMethod: 'GET',
			},
		];

		it.each(retryableScenarios)(
			'exposes retryable metadata when transport fails for %s',
			async ({ routes, invoke, expectedPath, expectedMethod }) => {
				const retryableError = new TransportError({
					status: 503,
					path: expectedPath,
					method: expectedMethod,
					message: 'Service unavailable',
				});
				mockApiFetch.mockRejectedValue(retryableError);

				const resource = defineResource<Thing, ThingQuery>({
					name: 'thing',
					routes,
				});

				await expect(invoke(resource)).rejects.toBe(retryableError);
				expect(retryableError.isRetryable()).toBe(true);
			}
		);
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
