/**
 * Unit tests for defineResource - Prefetch Methods
 *
 * Tests prefetchGet and prefetchList methods that preload data into cache
 */

import { defineResource } from '../define';

// Mock resource for testing
interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

// Use global types for window.wp

describe('defineResource - Prefetch Methods', () => {
	let mockWpData: any;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		// Create mock wp.data
		const mockResolveSelect = jest.fn().mockReturnValue({
			getItem: jest.fn().mockResolvedValue(undefined),
			getList: jest.fn().mockResolvedValue(undefined),
		});

		mockWpData = {
			dispatch: jest.fn().mockReturnValue({
				getItem: jest.fn(),
				getList: jest.fn(),
			}),
			resolveSelect: mockResolveSelect,
		};

		// Setup window.wp.data
		if (windowWithWp) {
			windowWithWp.wp = {
				data: mockWpData,
			};
		}
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp) {
			windowWithWp.wp = originalWp;
		}
	});

	describe('prefetchGet method', () => {
		it('should throw error if @wordpress/data is not loaded', async () => {
			// Remove wp.data
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			await expect(resource.prefetchGet!(1)).rejects.toThrow(
				'prefetchGet requires @wordpress/data to be loaded'
			);
		});

		it('should call resolveSelect to trigger prefetch', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			const mockGetItem = jest.fn().mockResolvedValue(undefined);
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				getItem: mockGetItem,
			});

			await resource.prefetchGet!(1);

			expect(mockWpData.resolveSelect).toHaveBeenCalledWith('wpk/thing');
			expect(mockGetItem).toHaveBeenCalledWith(1);
		});

		it('should handle missing getItem method gracefully', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			// Mock dispatch to return object without getItem
			mockWpData.dispatch = jest.fn().mockReturnValue({});
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				// No getItem method
			});

			// Should not throw
			await expect(resource.prefetchGet!(1)).resolves.toBeUndefined();
		});

		it('should be undefined when route not configured', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					// No get route
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource.prefetchGet).toBeUndefined();
		});

		it('should work with string IDs', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			const mockGetItem = jest.fn().mockResolvedValue(undefined);
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				getItem: mockGetItem,
			});

			await resource.prefetchGet!('abc-123');

			expect(mockGetItem).toHaveBeenCalledWith('abc-123');
		});
	});

	describe('prefetchList method', () => {
		it('should throw error if @wordpress/data is not loaded', async () => {
			// Remove wp.data
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			await expect(resource.prefetchList!()).rejects.toThrow(
				'prefetchList requires @wordpress/data to be loaded'
			);
		});

		it('should call resolveSelect to trigger prefetch', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const mockGetList = jest.fn().mockResolvedValue(undefined);
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				getList: mockGetList,
			});

			await resource.prefetchList!();

			expect(mockWpData.resolveSelect).toHaveBeenCalledWith('wpk/thing');
			expect(mockGetList).toHaveBeenCalledWith(undefined);
		});

		it('should pass query parameter to resolveSelect', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const query: MockThingQuery = { status: 'active' };
			const mockGetList = jest.fn().mockResolvedValue(undefined);
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				getList: mockGetList,
			});

			await resource.prefetchList!(query);

			expect(mockGetList).toHaveBeenCalledWith(query);
		});

		it('should handle missing getList method gracefully', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			// Mock dispatch to return object without getList
			mockWpData.dispatch = jest.fn().mockReturnValue({});
			mockWpData.resolveSelect = jest.fn().mockReturnValue({
				getList: jest.fn().mockResolvedValue(undefined),
			});

			// Should resolve to undefined
			await expect(resource.prefetchList!()).resolves.toBeUndefined();
		});

		it('should be undefined when route not configured', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					// No list route
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.prefetchList).toBeUndefined();
		});
	});
});
