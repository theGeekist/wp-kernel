/**
 * Unit tests for createResourceHelper
 */

import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import { createResourceHelper } from '../createKernelUtils.js';
import type { ResourceConfig } from '../types.js';

describe('createResourceHelper', () => {
	let mockRequestUtils: jest.Mocked<RequestUtils>;
	let resourceConfig: ResourceConfig;

	beforeEach(() => {
		mockRequestUtils = {
			rest: jest.fn(),
		} as unknown as jest.Mocked<RequestUtils>;

		resourceConfig = {
			name: 'job',
			routes: {
				list: { path: '/wpk/v1/jobs', method: 'GET' },
				create: { path: '/wpk/v1/jobs', method: 'POST' },
				get: { path: '/wpk/v1/jobs/:id', method: 'GET' },
				update: { path: '/wpk/v1/jobs/:id', method: 'PUT' },
				remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
			},
		};
	});

	describe('seed()', () => {
		it('should create resource with POST request', async () => {
			const mockData = { title: 'Engineer', salary: 100000 };
			const mockResponse = { id: 1, ...mockData };

			mockRequestUtils.rest.mockResolvedValue(mockResponse);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			const result = await helper.seed(mockData);

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/wpk/v1/jobs',
				method: 'POST',
				data: mockData,
			});
			expect(result).toEqual(mockResponse);
		});

		it('should throw error when create route is missing', async () => {
			const configWithoutCreate = {
				...resourceConfig,
				routes: {
					list: { path: '/wpk/v1/jobs', method: 'GET' },
				},
			};

			const helper = createResourceHelper(
				configWithoutCreate,
				mockRequestUtils
			);

			await expect(helper.seed({ title: 'Test' })).rejects.toThrow(
				'Resource "job" does not have a create route configured'
			);
		});

		it('should throw error when response is null', async () => {
			mockRequestUtils.rest.mockResolvedValue(null);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);

			await expect(helper.seed({ title: 'Test' })).rejects.toThrow(
				'Failed to seed resource "job": Invalid response'
			);
		});

		it('should throw error when response is not an object', async () => {
			mockRequestUtils.rest.mockResolvedValue('invalid' as unknown);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);

			await expect(helper.seed({ title: 'Test' })).rejects.toThrow(
				'Failed to seed resource "job": Invalid response'
			);
		});

		it('should derive identifier from config.store.getId when provided', async () => {
			const configWithStore = {
				...resourceConfig,
				store: {
					getId: (item: { slug: string }) => item.slug,
				},
			} satisfies ResourceConfig;

			const mockResponse = { slug: 'job-engineer', title: 'Engineer' };
			mockRequestUtils.rest.mockResolvedValue(mockResponse);

			const helper = createResourceHelper<{
				slug: string;
				title: string;
			}>(configWithStore, mockRequestUtils);

			const result = await helper.seed({ title: 'Engineer' });

			expect(result.id).toBe('job-engineer');
			expect(result.slug).toBe('job-engineer');
		});
	});

	describe('seedMany()', () => {
		it('should create multiple resources in parallel', async () => {
			const mockItems = [
				{ title: 'Engineer', salary: 100000 },
				{ title: 'Designer', salary: 90000 },
				{ title: 'Manager', salary: 110000 },
			];
			const mockResponses = [
				{ id: 1, ...mockItems[0] },
				{ id: 2, ...mockItems[1] },
				{ id: 3, ...mockItems[2] },
			];

			mockRequestUtils.rest
				.mockResolvedValueOnce(mockResponses[0])
				.mockResolvedValueOnce(mockResponses[1])
				.mockResolvedValueOnce(mockResponses[2]);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			const results = await helper.seedMany(mockItems);

			expect(mockRequestUtils.rest).toHaveBeenCalledTimes(3);
			expect(results).toEqual(mockResponses);
		});

		it('should throw error when create route is missing', async () => {
			const configWithoutCreate = {
				...resourceConfig,
				routes: {},
			};

			const helper = createResourceHelper(
				configWithoutCreate,
				mockRequestUtils
			);

			await expect(helper.seedMany([{ title: 'Test' }])).rejects.toThrow(
				'Resource "job" does not have a create route configured'
			);
		});

		it('should propagate error when any request fails', async () => {
			mockRequestUtils.rest
				.mockResolvedValueOnce({ id: 1, title: 'Test1' })
				.mockResolvedValueOnce(null);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);

			await expect(
				helper.seedMany([{ title: 'Test1' }, { title: 'Test2' }])
			).rejects.toThrow(
				'Failed to seed resource "job": Invalid response'
			);
		});

		it('should handle empty array', async () => {
			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			const results = await helper.seedMany([]);

			expect(results).toEqual([]);
			expect(mockRequestUtils.rest).not.toHaveBeenCalled();
		});

		it('should use store getId when returning seeded identifiers', async () => {
			const configWithStore = {
				...resourceConfig,
				store: {
					getId: (item: { uuid: string }) => item.uuid,
				},
			} satisfies ResourceConfig;

			const responses = [
				{ uuid: 'job-1', title: 'Engineer' },
				{ uuid: 'job-2', title: 'Designer' },
			];

			mockRequestUtils.rest
				.mockResolvedValueOnce(responses[0])
				.mockResolvedValueOnce(responses[1]);

			const helper = createResourceHelper<{ uuid: string }>(
				configWithStore,
				mockRequestUtils
			);

			const results = await helper.seedMany([
				{ title: 'Engineer' },
				{ title: 'Designer' },
			]);

			expect(results.map((item) => item.id)).toEqual(['job-1', 'job-2']);
		});
	});

	describe('remove()', () => {
		it('should delete resource with DELETE request', async () => {
			mockRequestUtils.rest.mockResolvedValue({});

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			await helper.remove(123);

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/wpk/v1/jobs/123',
				method: 'DELETE',
			});
		});

		it('should replace :id placeholder in path', async () => {
			mockRequestUtils.rest.mockResolvedValue({});

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			await helper.remove(456);

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/wpk/v1/jobs/456',
				method: 'DELETE',
			});
		});

		it('should throw error when remove route is missing', async () => {
			const configWithoutRemove = {
				...resourceConfig,
				routes: {
					create: { path: '/wpk/v1/jobs', method: 'POST' },
				},
			};

			const helper = createResourceHelper(
				configWithoutRemove,
				mockRequestUtils
			);

			await expect(helper.remove(123)).rejects.toThrow(
				'Resource "job" does not have a remove route configured'
			);
		});

		it('should accept string identifiers when removing resources', async () => {
			const configWithStore = {
				...resourceConfig,
				store: {
					getId: (item: { slug: string }) => item.slug,
				},
				routes: {
					...resourceConfig.routes,
					remove: {
						path: '/wpk/v1/jobs/:id',
						method: 'DELETE',
					},
				},
			} satisfies ResourceConfig;

			mockRequestUtils.rest.mockResolvedValue({});

			const helper = createResourceHelper(
				configWithStore,
				mockRequestUtils
			);

			await helper.remove('job-engineer');

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/wpk/v1/jobs/job-engineer',
				method: 'DELETE',
			});
		});
	});

	describe('deleteAll()', () => {
		it('should list all resources and delete each one', async () => {
			const mockList = [
				{ id: 1, title: 'Job 1' },
				{ id: 2, title: 'Job 2' },
				{ id: 3, title: 'Job 3' },
			];

			mockRequestUtils.rest
				.mockResolvedValueOnce(mockList)
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({});

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			await helper.deleteAll();

			expect(mockRequestUtils.rest).toHaveBeenCalledTimes(4);
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(1, {
				path: '/wpk/v1/jobs',
				method: 'GET',
			});
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(2, {
				path: '/wpk/v1/jobs/1',
				method: 'DELETE',
			});
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(3, {
				path: '/wpk/v1/jobs/2',
				method: 'DELETE',
			});
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(4, {
				path: '/wpk/v1/jobs/3',
				method: 'DELETE',
			});
		});

		it('should handle empty list', async () => {
			mockRequestUtils.rest.mockResolvedValueOnce([]);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			await helper.deleteAll();

			expect(mockRequestUtils.rest).toHaveBeenCalledTimes(1);
		});

		it('should skip items without id property', async () => {
			const mockList: Array<{ id?: number; title: string }> = [
				{ id: 1, title: 'Valid' },
				{ title: 'Invalid - no id' },
				{ id: 2, title: 'Valid' },
			];

			mockRequestUtils.rest
				.mockResolvedValueOnce(mockList)
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({});

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);
			await helper.deleteAll();

			// Should only delete valid items (1 list + 2 deletes)
			expect(mockRequestUtils.rest).toHaveBeenCalledTimes(3);
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(2, {
				path: '/wpk/v1/jobs/1',
				method: 'DELETE',
			});
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(3, {
				path: '/wpk/v1/jobs/2',
				method: 'DELETE',
			});
		});

		it('should use store getId when deleting slug resources', async () => {
			const configWithStore = {
				...resourceConfig,
				store: {
					getId: (item: { slug: string }) => item.slug,
				},
			} satisfies ResourceConfig;

			const mockList = [
				{ slug: 'job-1', title: 'Job 1' },
				{ slug: 'job-2', title: 'Job 2' },
			];

			mockRequestUtils.rest
				.mockResolvedValueOnce(mockList)
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({});

			const helper = createResourceHelper<{ slug: string }>(
				configWithStore,
				mockRequestUtils
			);

			await helper.deleteAll();

			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(2, {
				path: '/wpk/v1/jobs/job-1',
				method: 'DELETE',
			});
			expect(mockRequestUtils.rest).toHaveBeenNthCalledWith(3, {
				path: '/wpk/v1/jobs/job-2',
				method: 'DELETE',
			});
		});

		it('should throw error when list route is missing', async () => {
			const configWithoutList = {
				...resourceConfig,
				routes: {
					remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
				},
			};

			const helper = createResourceHelper(
				configWithoutList,
				mockRequestUtils
			);

			await expect(helper.deleteAll()).rejects.toThrow(
				'Resource "job" must have both list and remove routes for deleteAll()'
			);
		});

		it('should throw error when remove route is missing', async () => {
			const configWithoutRemove = {
				...resourceConfig,
				routes: {
					list: { path: '/wpk/v1/jobs', method: 'GET' },
				},
			};

			const helper = createResourceHelper(
				configWithoutRemove,
				mockRequestUtils
			);

			await expect(helper.deleteAll()).rejects.toThrow(
				'Resource "job" must have both list and remove routes for deleteAll()'
			);
		});

		it('should throw error when list returns non-array', async () => {
			mockRequestUtils.rest.mockResolvedValue({
				invalid: 'response',
			} as unknown);

			const helper = createResourceHelper(
				resourceConfig,
				mockRequestUtils
			);

			await expect(helper.deleteAll()).rejects.toThrow(
				'Failed to list resources "job": Expected array response'
			);
		});
	});

	describe('type safety', () => {
		it('should infer types from generic parameter', async () => {
			interface Job {
				title: string;
				salary: number;
				department: string;
			}

			const helper = createResourceHelper<Job>(
				resourceConfig,
				mockRequestUtils
			);

			mockRequestUtils.rest.mockResolvedValue({
				id: 1,
				title: 'Engineer',
				salary: 100000,
				department: 'Tech',
			});

			const result = await helper.seed({
				title: 'Engineer',
				salary: 100000,
			});

			// TypeScript should enforce that result has these properties
			expect(result.id).toBe(1);
			expect(result.title).toBe('Engineer');
		});
	});
});
