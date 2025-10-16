/**
 * Unit tests for defineResource - Prefetch Methods
 *
 * Tests prefetchGet and prefetchList methods that preload data into cache
 */

import { defineResource } from '../define';
import {
	createResourceDataHarness,
	withWordPressData,
	type ResourceHarnessSetup,
} from '../../../tests/resource.test-support';

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

describe('defineResource - Prefetch Methods', () => {
	let harnessSetup: ResourceHarnessSetup;
	let mockResolveSelect: jest.Mock;
	let mockDispatch: jest.Mock;

	beforeEach(() => {
		harnessSetup = createResourceDataHarness();
		mockResolveSelect = harnessSetup.resolveSelect;
		mockDispatch = harnessSetup.dispatch;

		mockResolveSelect.mockReturnValue({
			getItem: jest.fn().mockResolvedValue(undefined),
			getList: jest.fn().mockResolvedValue(undefined),
		});
		mockDispatch.mockReturnValue({
			getItem: jest.fn(),
			getList: jest.fn(),
		});
	});

	afterEach(() => {
		harnessSetup.harness.teardown();
	});

	describe('prefetchGet method', () => {
		it('should throw error if @wordpress/data is not loaded', async () => {
			await withWordPressData({ wp: null }, async () => {
				const resource = defineResource<MockThing, MockThingQuery>({
					name: 'thing',
					routes: {
						get: {
							path: '/my-plugin/v1/things/:id',
							method: 'GET',
						},
					},
				});

				await expect(resource.prefetchGet!(1)).rejects.toThrow(
					'prefetchGet requires @wordpress/data to be loaded'
				);
			});
		});

		it('should call resolveSelect to trigger prefetch', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			const mockGetItem = jest.fn().mockResolvedValue(undefined);
			mockResolveSelect.mockReturnValue({
				getItem: mockGetItem,
			});

			await resource.prefetchGet!(1);

			expect(mockResolveSelect).toHaveBeenCalledWith('wpk/thing');
			expect(mockGetItem).toHaveBeenCalledWith(1);
		});

		it('should handle missing getItem method gracefully', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			mockDispatch.mockReturnValue({});
			mockResolveSelect.mockReturnValue({});

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
			mockResolveSelect.mockReturnValue({
				getItem: mockGetItem,
			});

			await resource.prefetchGet!('abc-123');

			expect(mockGetItem).toHaveBeenCalledWith('abc-123');
		});
	});

	describe('prefetchList method', () => {
		it('should throw error if @wordpress/data is not loaded', async () => {
			await withWordPressData({ data: null }, async () => {
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
		});

		it('should call resolveSelect to trigger prefetch', async () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const mockGetList = jest.fn().mockResolvedValue(undefined);
			mockResolveSelect.mockReturnValue({
				getList: mockGetList,
			});

			await resource.prefetchList!();

			expect(mockResolveSelect).toHaveBeenCalledWith('wpk/thing');
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
			mockResolveSelect.mockReturnValue({
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

			mockDispatch.mockReturnValue({});
			mockResolveSelect.mockReturnValue({
				getList: jest.fn().mockResolvedValue(undefined),
			});

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
