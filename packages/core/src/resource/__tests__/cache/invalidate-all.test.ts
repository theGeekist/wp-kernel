/**
 * @file Cache Utilities Tests - Invalidate All
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidateAll } from '../../cache';
import { WPKernelEventBus, setWPKernelEventBus } from '../../../events/bus';
import {
	createResourceDataHarness,
	withWordPressData,
	type ResourceHarnessSetup,
} from '../../../../tests/resource.test-support';

describe('invalidateAll', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let harnessSetup: ResourceHarnessSetup;
	let bus: WPKernelEventBus;
	let cacheListener: jest.Mock;

	beforeEach(() => {
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		harnessSetup = createResourceDataHarness({
			data: {
				dispatch: mockDispatch,
				select: mockSelect,
			},
		});

		bus = new WPKernelEventBus();
		setWPKernelEventBus(bus);
		cacheListener = jest.fn();
		bus.on('cache:invalidated', cacheListener);
	});

	afterEach(() => {
		setWPKernelEventBus(new WPKernelEventBus());
		jest.clearAllMocks();
		harnessSetup.harness.teardown();
	});

	it('should call invalidateAll on the specified store', () => {
		const mockStoreDispatch = {
			invalidateAll: jest.fn(),
		};

		mockDispatch.mockReturnValue(mockStoreDispatch);

		invalidateAll('wpk/thing');

		expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
		expect(mockStoreDispatch.invalidateAll).toHaveBeenCalled();
	});

	it('should emit wpk.cache.invalidated event', () => {
		const mockStoreDispatch = {
			invalidateAll: jest.fn(),
		};

		mockDispatch.mockReturnValue(mockStoreDispatch);

		invalidateAll('wpk/thing');

		expect(cacheListener).toHaveBeenCalledWith({
			keys: ['wpk/thing:*'],
		});
	});

	it('should handle missing invalidateAll method gracefully', () => {
		const mockStoreDispatch = {}; // No invalidateAll method

		mockDispatch.mockReturnValue(mockStoreDispatch);

		// Should not throw
		expect(() => {
			invalidateAll('wpk/thing');
		}).not.toThrow();

		expect(cacheListener).not.toHaveBeenCalled();
	});

	it('should handle errors gracefully', () => {
		mockDispatch.mockImplementation(() => {
			throw new Error('Store error');
		});

		// Should not throw
		expect(() => {
			invalidateAll('wpk/thing');
		}).not.toThrow();
	});

	it('should handle missing window.wp gracefully', async () => {
		await withWordPressData({ wp: null }, () => {
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();
		});
	});
});
