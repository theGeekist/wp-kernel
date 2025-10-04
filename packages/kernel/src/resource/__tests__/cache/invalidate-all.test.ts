/**
 * @file Cache Utilities Tests - Invalidate All
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidateAll } from '../../cache';

// Use global types for window.wp

describe('invalidateAll', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: Window['wp'];

	beforeEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		mockDoAction = jest.fn();

		if (windowWithWp) {
			windowWithWp.wp = {
				data: {
					dispatch: mockDispatch,
					select: mockSelect,
				},
				hooks: {
					doAction: mockDoAction,
				},
			};
		}
	});

	afterEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
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

		expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
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

		expect(mockDoAction).not.toHaveBeenCalled();
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
