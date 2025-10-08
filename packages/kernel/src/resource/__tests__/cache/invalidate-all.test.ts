/**
 * @file Cache Utilities Tests - Invalidate All
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidateAll } from '../../cache';
import { KernelEventBus, setKernelEventBus } from '../../../events/bus';

// Use global types for window.wp

describe('invalidateAll', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let bus: KernelEventBus;
	let cacheListener: jest.Mock;
	let originalWp: Window['wp'];

	beforeEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		mockDispatch = jest.fn();
		mockSelect = jest.fn();

		if (windowWithWp) {
			windowWithWp.wp = {
				data: {
					dispatch: mockDispatch,
					select: mockSelect,
				},
			};
		}

		bus = new KernelEventBus();
		setKernelEventBus(bus);
		cacheListener = jest.fn();
		bus.on('cache:invalidated', cacheListener);
	});

	afterEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		setKernelEventBus(new KernelEventBus());
		jest.clearAllMocks();
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

	it('should handle missing window.wp gracefully', () => {
		const windowWithWp = global.window as Window & { wp?: any };
		const savedWp = windowWithWp?.wp;

		if (windowWithWp) {
			delete windowWithWp.wp;
		}

		// Should not throw when dataRegistry is unavailable
		expect(() => {
			invalidateAll('wpk/thing');
		}).not.toThrow();

		// Restore
		if (windowWithWp && savedWp) {
			windowWithWp.wp = savedWp;
		}
	});
});
