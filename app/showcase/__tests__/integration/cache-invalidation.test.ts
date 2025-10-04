/**
 * Integration test for cache invalidation and refetch behavior.
 *
 * This test reproduces the issue where calling cache.invalidate.list()
 * doesn't trigger an automatic refetch in the useList hook.
 */

import { defineResource } from '@geekist/wp-kernel/resource';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import * as wpData from '@wordpress/data';
import type { Job } from '../../types/job';

type WordPressWindow = Window &
	typeof globalThis & {
		wp?: {
			data: typeof wpData;
		};
	};

describe('Job resource cache invalidation', () => {
	let resource: ResourceObject<Job, void>;
	let mockFetchList: jest.Mock;

	beforeEach(() => {
		// Setup WordPress data in window
		(window as WordPressWindow).wp = {
			data: wpData,
		};

		// Define the job resource
		resource = defineResource<Job, void>({
			name: 'job',
			namespace: 'wp-kernel-showcase',
			routes: {
				list: { path: '/wp-kernel-showcase/v1/jobs', method: 'GET' },
			},
		});

		// Mock fetchList to return some jobs
		mockFetchList = jest.fn().mockResolvedValue({
			items: [
				{
					id: 1,
					title: 'Senior QA',
					description: 'Test job',
					status: 'publish',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			],
			total: 1,
			hasMore: false,
			nextCursor: undefined,
		});

		resource.fetchList = mockFetchList;

		// Trigger store registration
		void resource.store;
	});

	afterEach(() => {
		const unregister = (
			wpData as unknown as {
				unregisterStore?: (key: string) => void;
			}
		).unregisterStore;

		try {
			unregister?.(resource.storeKey);
		} catch (_error) {
			// Ignore errors
		}

		delete (window as WordPressWindow).wp;
	});

	it('should refetch list after cache invalidation', async () => {
		// 1. Initial fetch
		await wpData.resolveSelect(resource.storeKey).getList();
		expect(mockFetchList).toHaveBeenCalledTimes(1);

		const selectors = wpData.select(resource.storeKey) as {
			getList: () => { items: Job[] };
			getListStatus: () => 'idle' | 'loading' | 'success' | 'error';
		};

		let list = selectors.getList();
		expect(list.items).toHaveLength(1);
		expect(list.items[0].title).toBe('Senior QA');

		// 2. Update mock to return different data
		mockFetchList.mockResolvedValue({
			items: [
				{
					id: 1,
					title: 'Senior QA',
					description: 'Test job',
					status: 'publish',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				{
					id: 2,
					title: 'Platform QA Lead',
					description: 'New job',
					status: 'publish',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			],
			total: 2,
			hasMore: false,
			nextCursor: undefined,
		});

		// 3. Invalidate cache (this is what CreateJob action does)
		const storeSelect = wpData.select(resource.storeKey) as {
			getState?: () => unknown;
			getList: () => { items: Job[] };
		};
		console.log('Before invalidation:', {
			storeKey: resource.storeKey,
			hasGetState: !!storeSelect.getState,
			selectorKeys: Object.keys(storeSelect),
		});
		resource.cache.invalidate.list();
		console.log('After invalidation - checking if data was removed');

		// 4. Check if data is still cached (it should be gone)
		list = selectors.getList();
		console.log('After invalidation:', { items: list.items });

		// 5. Try to trigger refetch by calling resolveSelect again
		await wpData.resolveSelect(resource.storeKey).getList();

		// 6. Should have fetched again
		expect(mockFetchList).toHaveBeenCalledTimes(2);

		// 7. Should have new data
		list = selectors.getList();
		expect(list.items).toHaveLength(2);
		expect(list.items[1].title).toBe('Platform QA Lead');
	});

	it('should demonstrate the hanging prefetchList issue', async () => {
		// 1. Initial fetch
		await wpData.resolveSelect(resource.storeKey).getList();
		expect(mockFetchList).toHaveBeenCalledTimes(1);

		// 2. Invalidate cache
		resource.cache.invalidate.list();

		// 3. Try to use prefetchList (this is what hangs in the UI)
		// Add a timeout to prevent test from hanging
		const timeoutPromise = new Promise<void>((_, reject) =>
			setTimeout(() => reject(new Error('prefetchList timed out')), 1000)
		);

		const prefetchPromise = resource.prefetchList?.();

		// This should either complete or timeout
		await expect(
			Promise.race([prefetchPromise, timeoutPromise])
		).rejects.toThrow('prefetchList timed out');

		// If we get here, prefetchList hung (which is the bug)
	}, 2000);
});
