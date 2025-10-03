/**
 * Unit tests for createKernelUtils factory
 *
 */

import type { Page } from '@playwright/test';
import type {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';
import { createKernelUtils } from '../createKernelUtils.js';
import type { WordPressFixtures } from '../types.js';

describe('createKernelUtils', () => {
	let mockPage: jest.Mocked<Page>;
	let mockRequestUtils: jest.Mocked<RequestUtils>;
	let mockAdmin: jest.Mocked<Admin>;
	let mockEditor: jest.Mocked<Editor>;
	let mockPageUtils: jest.Mocked<PageUtils>;
	let fixtures: WordPressFixtures;

	beforeEach(() => {
		// Mock Page
		mockPage = {
			evaluate: jest.fn(),
			waitForTimeout: jest.fn(),
		} as unknown as jest.Mocked<Page>;

		// Mock RequestUtils
		mockRequestUtils = {
			rest: jest.fn(),
		} as unknown as jest.Mocked<RequestUtils>;

		// Mock Admin
		mockAdmin = {} as jest.Mocked<Admin>;

		// Mock Editor
		mockEditor = {} as jest.Mocked<Editor>;

		// Mock PageUtils
		mockPageUtils = {} as jest.Mocked<PageUtils>;

		fixtures = {
			page: mockPage,
			requestUtils: mockRequestUtils,
			admin: mockAdmin,
			editor: mockEditor,
			pageUtils: mockPageUtils,
		};
	});

	describe('factory initialization', () => {
		it('should create kernel utils with all helpers', () => {
			const kernel = createKernelUtils(fixtures);

			expect(kernel).toBeDefined();
			expect(kernel.resource).toBeInstanceOf(Function);
			expect(kernel.store).toBeInstanceOf(Function);
			expect(kernel.events).toBeInstanceOf(Function);
		});

		it('should return different instances for multiple calls', () => {
			const kernel1 = createKernelUtils(fixtures);
			const kernel2 = createKernelUtils(fixtures);

			expect(kernel1).not.toBe(kernel2);
		});
	});

	describe('resource helper factory', () => {
		it('should create resource utilities', () => {
			const kernel = createKernelUtils(fixtures);
			const resourceConfig = {
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' as const },
				},
			} as const;

			const resource = kernel.resource(resourceConfig);

			expect(resource).toBeDefined();
			expect(resource.seed).toBeInstanceOf(Function);
			expect(resource.seedMany).toBeInstanceOf(Function);
			expect(resource.remove).toBeInstanceOf(Function);
			expect(resource.deleteAll).toBeInstanceOf(Function);
		});

		it('should pass requestUtils to resource utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const resourceConfig = {
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' as const },
				},
			} as const;

			mockRequestUtils.rest.mockResolvedValue({ id: 1, title: 'Test' });

			const resource = kernel.resource(resourceConfig);
			await resource.seed({ title: 'Test' });

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/test',
				method: 'POST',
				data: { title: 'Test' },
			});
		});
	});

	describe('store helper factory', () => {
		it('should create store utilities', () => {
			const kernel = createKernelUtils(fixtures);
			const store = kernel.store('wpk/test');

			expect(store).toBeDefined();
			expect(store.wait).toBeInstanceOf(Function);
			expect(store.invalidate).toBeInstanceOf(Function);
			expect(store.getState).toBeInstanceOf(Function);
		});

		it('should pass page to store utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const store = kernel.store('wpk/test');

			mockPage.evaluate.mockResolvedValue({ test: 'state' });

			const state = await store.getState();

			expect(mockPage.evaluate).toHaveBeenCalled();
			expect(state).toEqual({ test: 'state' });
		});
	});

	describe('event helper factory', () => {
		it('should create event utilities', async () => {
			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			const events = await kernel.events();

			expect(events).toBeDefined();
			expect(events.list).toBeInstanceOf(Function);
			expect(events.find).toBeInstanceOf(Function);
			expect(events.findAll).toBeInstanceOf(Function);
			expect(events.clear).toBeInstanceOf(Function);
			expect(events.stop).toBeInstanceOf(Function);
		});

		it('should pass page to event utilities', async () => {
			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			await kernel.events();

			expect(mockPage.evaluate).toHaveBeenCalled();
		});

		it('should pass options to event utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const pattern = /^wpk\.test\./;

			mockPage.evaluate.mockResolvedValueOnce('wpk'); // namespace detection
			mockPage.evaluate.mockResolvedValueOnce(undefined); // setup

			await kernel.events({ pattern });

			expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				1,
				expect.any(Function)
			); // namespace detection
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				2,
				expect.any(Function),
				{ filterPattern: pattern.source, eventPattern: 'wpk.*' }
			);
		});
	});

	describe('type safety', () => {
		it('should infer types from resource config', () => {
			interface TestResource {
				title: string;
				count: number;
			}

			const kernel = createKernelUtils(fixtures);
			const resource = kernel.resource<TestResource>({
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' },
				},
			});

			// TypeScript should enforce types here
			// This is a compile-time test
			expect(resource.seed).toBeDefined();
		});

		it('should infer types from store key', () => {
			interface TestStore {
				getItems: () => string[];
			}

			const kernel = createKernelUtils(fixtures);
			const store = kernel.store<TestStore>('wpk/test');

			// TypeScript should enforce types here
			expect(store.wait).toBeDefined();
		});

		it('should infer types from event payload', async () => {
			interface TestPayload {
				id: number;
				data: string;
			}

			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			const events = await kernel.events<TestPayload>();

			// TypeScript should enforce types here
			expect(events.list).toBeDefined();
		});
	});

	describe('resource utilities implementation', () => {
		let kernel: ReturnType<typeof createKernelUtils>;
		let resource: ReturnType<typeof kernel.resource>;

		beforeEach(() => {
			kernel = createKernelUtils(fixtures);
			resource = kernel.resource({
				name: 'job',
				routes: {
					list: { path: '/wpk/v1/jobs', method: 'GET' },
					create: { path: '/wpk/v1/jobs', method: 'POST' },
					remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
				},
			});
		});

		describe('seed()', () => {
			it('should create a single resource via REST', async () => {
				const mockData = { title: 'Engineer' };
				const mockResponse = { id: 1, title: 'Engineer' };

				mockRequestUtils.rest.mockResolvedValue(mockResponse);

				const result = await resource.seed(mockData);

				expect(mockRequestUtils.rest).toHaveBeenCalledWith({
					path: '/wpk/v1/jobs',
					method: 'POST',
					data: mockData,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should throw error when create route is missing', async () => {
				const resourceWithoutCreate = kernel.resource({
					name: 'test',
					routes: {},
				});

				await expect(
					resourceWithoutCreate.seed({ title: 'Test' })
				).rejects.toThrow(
					'Resource "test" does not have a create route configured'
				);
			});

			it('should throw error when REST response is invalid', async () => {
				mockRequestUtils.rest.mockResolvedValue(null);

				await expect(resource.seed({ title: 'Test' })).rejects.toThrow(
					'Failed to seed resource "job": Invalid response'
				);
			});
		});

		describe('seedMany()', () => {
			it('should create multiple resources in bulk', async () => {
				const mockItems = [
					{ title: 'Engineer' },
					{ title: 'Designer' },
				];
				const mockResponses = [
					{ id: 1, title: 'Engineer' },
					{ id: 2, title: 'Designer' },
				];

				mockRequestUtils.rest
					.mockResolvedValueOnce(mockResponses[0])
					.mockResolvedValueOnce(mockResponses[1]);

				const results = await resource.seedMany(mockItems);

				expect(mockRequestUtils.rest).toHaveBeenCalledTimes(2);
				expect(results).toEqual(mockResponses);
			});

			it('should throw error when create route is missing', async () => {
				const resourceWithoutCreate = kernel.resource({
					name: 'test',
					routes: {},
				});

				await expect(
					resourceWithoutCreate.seedMany([{ title: 'Test' }])
				).rejects.toThrow(
					'Resource "test" does not have a create route configured'
				);
			});

			it('should throw error when any REST response is invalid', async () => {
				mockRequestUtils.rest
					.mockResolvedValueOnce({ id: 1, title: 'Test' })
					.mockResolvedValueOnce(null);

				await expect(
					resource.seedMany([{ title: 'Test1' }, { title: 'Test2' }])
				).rejects.toThrow(
					'Failed to seed resource "job": Invalid response'
				);
			});
		});

		describe('remove()', () => {
			it('should delete a resource by ID', async () => {
				mockRequestUtils.rest.mockResolvedValue({});

				await resource.remove(123);

				expect(mockRequestUtils.rest).toHaveBeenCalledWith({
					path: '/wpk/v1/jobs/123',
					method: 'DELETE',
				});
			});

			it('should throw error when remove route is missing', async () => {
				const resourceWithoutRemove = kernel.resource({
					name: 'test',
					routes: {
						create: { path: '/test', method: 'POST' },
					},
				});

				await expect(resourceWithoutRemove.remove(123)).rejects.toThrow(
					'Resource "test" does not have a remove route configured'
				);
			});
		});

		describe('deleteAll()', () => {
			it('should list and delete all resources', async () => {
				const mockList = [
					{ id: 1, title: 'Job 1' },
					{ id: 2, title: 'Job 2' },
				];

				mockRequestUtils.rest
					.mockResolvedValueOnce(mockList) // list call
					.mockResolvedValueOnce({}) // first delete
					.mockResolvedValueOnce({}); // second delete

				await resource.deleteAll();

				expect(mockRequestUtils.rest).toHaveBeenCalledWith({
					path: '/wpk/v1/jobs',
					method: 'GET',
				});
				expect(mockRequestUtils.rest).toHaveBeenCalledWith({
					path: '/wpk/v1/jobs/1',
					method: 'DELETE',
				});
				expect(mockRequestUtils.rest).toHaveBeenCalledWith({
					path: '/wpk/v1/jobs/2',
					method: 'DELETE',
				});
			});

			it('should throw error when list route is missing', async () => {
				const resourceWithoutList = kernel.resource({
					name: 'test',
					routes: {
						create: { path: '/test', method: 'POST' },
						remove: { path: '/test/:id', method: 'DELETE' },
					},
				});

				await expect(resourceWithoutList.deleteAll()).rejects.toThrow(
					'Resource "test" must have both list and remove routes for deleteAll()'
				);
			});

			it('should throw error when remove route is missing', async () => {
				const resourceWithoutRemove = kernel.resource({
					name: 'test',
					routes: {
						list: { path: '/test', method: 'GET' },
					},
				});

				await expect(resourceWithoutRemove.deleteAll()).rejects.toThrow(
					'Resource "test" must have both list and remove routes for deleteAll()'
				);
			});

			it('should throw error when list response is not an array', async () => {
				mockRequestUtils.rest.mockResolvedValue({
					invalid: 'response',
				});

				await expect(resource.deleteAll()).rejects.toThrow(
					'Failed to list resources "job": Expected array response'
				);
			});

			it('should skip items without id property', async () => {
				const mockList = [
					{ id: 1, title: 'Job 1' },
					{ title: 'Invalid' }, // no id
					{ id: 2, title: 'Job 2' },
				];

				mockRequestUtils.rest
					.mockResolvedValueOnce(mockList)
					.mockResolvedValueOnce({})
					.mockResolvedValueOnce({});

				await resource.deleteAll();

				// Should only delete items with id (2 calls)
				expect(mockRequestUtils.rest).toHaveBeenCalledTimes(3); // 1 list + 2 deletes
			});
		});
	});

	describe('store utilities implementation', () => {
		let kernel: ReturnType<typeof createKernelUtils>;
		let store: ReturnType<typeof kernel.store>;

		beforeEach(() => {
			kernel = createKernelUtils(fixtures);
			store = kernel.store('wpk/job');
		});

		describe('wait()', () => {
			it('should wait for selector to return truthy value', async () => {
				const mockState = { items: [{ id: 1 }] };

				mockPage.evaluate.mockResolvedValue(mockState.items);

				const result = await store.wait((state: any) => state.items);

				expect(result).toEqual(mockState.items);
				expect(mockPage.evaluate).toHaveBeenCalled();
			});

			it('should poll until data appears', async () => {
				mockPage.evaluate
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce([{ id: 1 }]);

				mockPage.waitForTimeout.mockResolvedValue(undefined);

				const result = await store.wait((state: any) => state.items);

				expect(result).toEqual([{ id: 1 }]);
				expect(mockPage.waitForTimeout).toHaveBeenCalledWith(100);
			});

			it('should timeout after specified duration', async () => {
				mockPage.evaluate.mockResolvedValue(null);
				mockPage.waitForTimeout.mockResolvedValue(undefined);

				// Mock Date.now to simulate timeout
				const originalDateNow = Date.now;
				let callCount = 0;
				Date.now = jest.fn(() => {
					callCount++;
					return callCount > 10 ? 6000 : 0; // Timeout at 6000ms
				});

				await expect(
					store.wait((state: any) => state.items, 5000)
				).rejects.toThrow(
					'Timeout waiting for store "wpk/job" selector after 5000ms'
				);

				Date.now = originalDateNow;
			});
		});

		describe('invalidate()', () => {
			it('should invalidate store cache', async () => {
				mockPage.evaluate.mockResolvedValue(undefined);

				await store.invalidate();

				expect(mockPage.evaluate).toHaveBeenCalledWith(
					expect.any(Function),
					'wpk/job'
				);
			});
		});

		describe('getState()', () => {
			it('should return current store state', async () => {
				const mockState = {
					items: [{ id: 1, title: 'Test' }],
					loading: false,
				};

				mockPage.evaluate.mockResolvedValue(mockState);

				const state = await store.getState();

				expect(state).toEqual(mockState);
				expect(mockPage.evaluate).toHaveBeenCalledWith(
					expect.any(Function),
					'wpk/job'
				);
			});
		});
	});

	describe('event utilities implementation', () => {
		let kernel: ReturnType<typeof createKernelUtils>;

		beforeEach(() => {
			kernel = createKernelUtils(fixtures);
			mockPage.evaluate.mockClear();
		});

		describe('initialization', () => {
			it('should inject event listener on page', async () => {
				mockPage.evaluate.mockResolvedValueOnce('wpk'); // namespace detection
				mockPage.evaluate.mockResolvedValueOnce(undefined); // setup

				await kernel.events();

				expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
				expect(mockPage.evaluate).toHaveBeenNthCalledWith(
					1,
					expect.any(Function)
				); // namespace detection
				expect(mockPage.evaluate).toHaveBeenNthCalledWith(
					2,
					expect.any(Function),
					{ filterPattern: undefined, eventPattern: 'wpk.*' }
				);
			});

			it('should pass pattern filter to page', async () => {
				mockPage.evaluate.mockResolvedValueOnce('wpk'); // namespace detection
				mockPage.evaluate.mockResolvedValueOnce(undefined); // setup
				const pattern = /^wpk\.job\./;

				await kernel.events({ pattern });

				expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
				expect(mockPage.evaluate).toHaveBeenNthCalledWith(
					1,
					expect.any(Function)
				); // namespace detection
				expect(mockPage.evaluate).toHaveBeenNthCalledWith(
					2,
					expect.any(Function),
					{ filterPattern: pattern.source, eventPattern: 'wpk.*' }
				);
			});
		});

		describe('list()', () => {
			it('should return all captured events', async () => {
				const mockEvents = [
					{
						type: 'wpk.job.created',
						payload: { id: 1 },
						timestamp: 123,
					},
					{
						type: 'wpk.job.updated',
						payload: { id: 1 },
						timestamp: 456,
					},
				];

				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(mockEvents);

				const events = await recorder.list();

				expect(events).toEqual(mockEvents);
			});
		});

		describe('find()', () => {
			it('should return first matching event', async () => {
				const mockEvent = {
					type: 'wpk.job.created',
					payload: { id: 1 },
					timestamp: 123,
				};

				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(mockEvent);

				const event = await recorder.find('wpk.job.created');

				expect(event).toEqual(mockEvent);
				expect(mockPage.evaluate).toHaveBeenCalledWith(
					expect.any(Function),
					'wpk.job.created'
				);
			});

			it('should return undefined when event not found', async () => {
				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(undefined);

				const event = await recorder.find('wpk.job.deleted');

				expect(event).toBeUndefined();
			});
		});

		describe('findAll()', () => {
			it('should return all matching events', async () => {
				const mockEvents = [
					{
						type: 'wpk.job.updated',
						payload: { id: 1 },
						timestamp: 123,
					},
					{
						type: 'wpk.job.updated',
						payload: { id: 2 },
						timestamp: 456,
					},
				];

				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(mockEvents);

				const events = await recorder.findAll('wpk.job.updated');

				expect(events).toEqual(mockEvents);
				expect(mockPage.evaluate).toHaveBeenCalledWith(
					expect.any(Function),
					'wpk.job.updated'
				);
			});
		});

		describe('clear()', () => {
			it('should clear all captured events', async () => {
				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(undefined);

				await recorder.clear();

				expect(mockPage.evaluate).toHaveBeenCalled();
			});
		});

		describe('stop()', () => {
			it('should stop recording events', async () => {
				const recorder = await kernel.events();

				mockPage.evaluate.mockResolvedValue(undefined);

				await recorder.stop();

				expect(mockPage.evaluate).toHaveBeenCalled();
			});
		});
	});
});
