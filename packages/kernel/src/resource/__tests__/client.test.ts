/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';

interface Thing {
	id: number;
	title: string;
	description: string;
}

describe('defineResource - client methods', () => {
	describe('client method generation', () => {
		it('should generate fetchList method when list route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.fetchList).toBeDefined();
			expect(typeof resource.fetchList).toBe('function');
		});

		it('should not generate fetchList method when list route is not defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.fetchList).toBeUndefined();
		});

		it('should generate fetch method when get route is defined', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.fetch).toBeDefined();
			expect(typeof resource.fetch).toBe('function');
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

			expect(resource.fetchList).toBeDefined();
			expect(resource.fetch).toBeDefined();
			expect(resource.create).toBeDefined();
			expect(resource.update).toBeDefined();
			expect(resource.remove).toBeDefined();
		});
	});

	describe('client write methods (create/update/remove)', () => {
		let mockApiFetch: jest.Mock;
		let originalWp: any;

		beforeEach(() => {
			// Mock @wordpress/api-fetch
			mockApiFetch = jest.fn();

			// Save original wp object
			originalWp = (global as any).window?.wp;

			// Setup global wp object
			if (typeof (global as any).window !== 'undefined') {
				(global as any).window.wp = {
					apiFetch: mockApiFetch,
					hooks: {
						doAction: jest.fn(),
					},
				};
			}
		});

		afterEach(() => {
			// Restore original wp object
			if (typeof (global as any).window !== 'undefined') {
				if (originalWp) {
					(global as any).window.wp = originalWp;
				} else {
					delete (global as any).window.wp;
				}
			}
		});

		it('should call transportFetch when create is called', async () => {
			const mockData = { id: 1, title: 'Test' };
			mockApiFetch.mockResolvedValue(mockData);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			const result = await resource.create!({ title: 'Test' });
			expect(result).toEqual(mockData);
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things',
				method: 'POST',
				data: { title: 'Test' },
				parse: true,
			});
		});

		it('should call transportFetch when update is called', async () => {
			const mockData = { id: 123, title: 'Updated' };
			mockApiFetch.mockResolvedValue(mockData);

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					update: {
						path: '/wpk/v1/things/:id',
						method: 'PUT',
					},
				},
			});

			const result = await resource.update!(123, { title: 'Updated' });
			expect(result).toEqual(mockData);
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things/123',
				method: 'PUT',
				data: { title: 'Updated' },
				parse: true,
			});
		});

		it('should call transportFetch when remove is called', async () => {
			mockApiFetch.mockResolvedValue({});

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					remove: {
						path: '/wpk/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			const result = await resource.remove!(123);
			expect(result).toBeUndefined(); // DELETE returns void
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/wpk/v1/things/123',
				method: 'DELETE',
				parse: true,
			});
		});

		it('should handle transport errors correctly', async () => {
			mockApiFetch.mockRejectedValue(new Error('Network error'));

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			await expect(resource.create!({ title: 'Test' })).rejects.toThrow(
				'Network error'
			);
		});
	});
});
