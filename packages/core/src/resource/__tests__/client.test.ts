/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import {
	createApiFetchHarness,
	type ApiFetchHarness,
} from '../../../tests/resource.test-support';

interface Thing {
	id: number;
	title: string;
	description: string;
}

describe('defineResource - client methods', () => {
	describe('client method generation', () => {
		it('should generate fetchList method when list route is defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource.fetchList).toBeDefined();
			expect(typeof resource.fetchList).toBe('function');
		});

		it('should not generate fetchList method when list route is not defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.fetchList).toBeUndefined();
		});

		it('should generate fetch method when get route is defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.fetch).toBeDefined();
			expect(typeof resource.fetch).toBe('function');
		});

		it('should generate create method when create route is defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					create: { path: '/my-plugin/v1/things', method: 'POST' },
				},
			});

			expect(resource.create).toBeDefined();
			expect(typeof resource.create).toBe('function');
		});

		it('should generate update method when update route is defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					update: {
						path: '/my-plugin/v1/things/:id',
						method: 'PUT',
					},
				},
			});

			expect(resource.update).toBeDefined();
			expect(typeof resource.update).toBe('function');
		});

		it('should generate remove method when remove route is defined', async () => {
			const resource = await defineResource({
				name: 'thing',
				routes: {
					remove: {
						path: '/my-plugin/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			expect(resource.remove).toBeDefined();
			expect(typeof resource.remove).toBe('function');
		});

		it('should generate all methods for full CRUD config', async () => {
			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
					create: { path: '/my-plugin/v1/things', method: 'POST' },
					update: {
						path: '/my-plugin/v1/things/:id',
						method: 'PUT',
					},
					remove: {
						path: '/my-plugin/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			expect(resource.fetchList).toBeDefined();
			expect(resource.fetch).toBeDefined();
			expect(resource.create).toBeDefined();
			expect(resource.update).toBeDefined();
			expect(resource.remove).toBeDefined();
		});
	});

	describe('client write methods (create/update/remove)', () => {
		let mockApiFetch: jest.Mock;
		let apiHarness: ApiFetchHarness;

		beforeEach(() => {
			// Mock @wordpress/api-fetch
			apiHarness = createApiFetchHarness();
			mockApiFetch = apiHarness.apiFetch;
		});

		afterEach(() => {
			apiHarness.harness.teardown();
		});

		it('should call transportFetch when create is called', async () => {
			const mockData = { id: 1, title: 'Test' };
			mockApiFetch.mockResolvedValue(mockData);

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/my-plugin/v1/things', method: 'POST' },
				},
			});

			const result = await resource.create!({ title: 'Test' });
			expect(result).toEqual(mockData);
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things',
				method: 'POST',
				data: { title: 'Test' },
				parse: true,
			});
		});

		it('should call transportFetch when update is called', async () => {
			const mockData = { id: 123, title: 'Updated' };
			mockApiFetch.mockResolvedValue(mockData);

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					update: {
						path: '/my-plugin/v1/things/:id',
						method: 'PUT',
					},
				},
			});

			const result = await resource.update!(123, { title: 'Updated' });
			expect(result).toEqual(mockData);
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things/123',
				method: 'PUT',
				data: { title: 'Updated' },
				parse: true,
			});
		});

		it('should call transportFetch when remove is called', async () => {
			mockApiFetch.mockResolvedValue({});

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					remove: {
						path: '/my-plugin/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			const result = await resource.remove!(123);
			expect(result).toBeUndefined(); // DELETE returns void
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things/123',
				method: 'DELETE',
				parse: true,
			});
		});

		it('should handle transport errors correctly', async () => {
			mockApiFetch.mockRejectedValue(new Error('Network error'));

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/my-plugin/v1/things', method: 'POST' },
				},
			});

			await expect(resource.create!({ title: 'Test' })).rejects.toThrow(
				'Network error'
			);
		});

		it('should normalize object response with items property in fetchList', async () => {
			// Mock an object response (not an array)
			const mockObjectResponse = {
				items: [
					{ id: 1, title: 'Thing 1', description: 'First' },
					{ id: 2, title: 'Thing 2', description: 'Second' },
				],
				total: 10,
				hasMore: true,
				nextCursor: 'cursor123',
			};

			mockApiFetch.mockResolvedValue(mockObjectResponse);

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const result = await resource.fetchList!();

			expect(result.items).toEqual(mockObjectResponse.items);
			expect(result.total).toBe(10);
			expect(result.hasMore).toBe(true);
			expect(result.nextCursor).toBe('cursor123');
		});

		it('should handle object response without items property in fetchList', async () => {
			// Mock an object response without items property
			const mockObjectResponse = {
				total: 0,
				hasMore: false,
			};

			mockApiFetch.mockResolvedValue(mockObjectResponse);

			const resource = await defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const result = await resource.fetchList!();

			// Should fallback to empty array
			expect(result.items).toEqual([]);
			expect(result.total).toBe(0);
			expect(result.hasMore).toBe(false);
		});
	});
});
