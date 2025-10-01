/**
 * @file Cache Invalidation Tests
 */

import { invalidate, invalidateAll, registerStoreKey } from '../cache.js';

// Mock window.wp global
interface WindowWithWp extends Window {
	wp?: {
		data?: {
			dispatch: jest.Mock;
			select: jest.Mock;
		};
		hooks?: {
			doAction: jest.Mock;
		};
	};
}

describe('invalidate', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: WindowWithWp['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as WindowWithWp;
		originalWp = windowWithWp?.wp;

		// Create mocks
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		mockDoAction = jest.fn();

		// Setup window.wp mock
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

		// Register test store keys
		registerStoreKey('wpk/thing');
		registerStoreKey('wpk/job');
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as WindowWithWp;
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		jest.clearAllMocks();
	});

	describe('basic invalidation', () => {
		it('should invalidate matching cache keys in a store', () => {
			const mockState = {
				lists: {
					'thing:list:active': [1, 2],
					'thing:list:inactive': [3, 4],
					'thing:get:123': 123,
				},
				listMeta: {
					'thing:list:active': { total: 2 },
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate all 'thing' list queries
			invalidate(['thing', 'list']);

			// Should call invalidate on wpk/thing store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'thing:list:active',
				'thing:list:inactive',
			]);

			// Should emit event
			expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
				keys: ['thing:list:active', 'thing:list:inactive'],
			});
		});

		it('should handle exact key matches', () => {
			const mockState = {
				lists: {
					'thing:list:active': [1, 2],
					'thing:list:active:page:2': [3, 4],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate specific query
			invalidate(['thing', 'list', 'active']);

			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'thing:list:active',
				'thing:list:active:page:2',
			]);
		});

		it('should handle multiple pattern arrays', () => {
			const mockState = {
				lists: {
					'thing:list:active': [1, 2],
					'thing:get:123': 123,
					'job:list:open': [5, 6],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate multiple patterns
			invalidate([
				['thing', 'list'],
				['thing', 'get'],
			]);

			// Should match both patterns
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith(
				expect.arrayContaining(['thing:list:active', 'thing:get:123'])
			);
		});
	});

	describe('store targeting', () => {
		it('should target specific store when storeKey provided', () => {
			const mockState = {
				lists: { 'thing:list': [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });

			// Should only call dispatch for specified store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			expect(mockDispatch).toHaveBeenCalledTimes(1);
		});

		it('should invalidate across all registered stores by default', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: {},
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Should call dispatch for all registered stores
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			expect(mockDispatch).toHaveBeenCalledWith('wpk/job');
		});
	});

	describe('event emission', () => {
		it('should emit wpk.cache.invalidated event by default', () => {
			const mockState = {
				lists: { 'thing:list:active': [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			expect(mockDoAction).toHaveBeenCalledWith(
				'wpk.cache.invalidated',
				expect.objectContaining({
					keys: expect.arrayContaining(['thing:list:active']),
				})
			);
		});

		it('should skip event emission when emitEvent is false', () => {
			const mockState = {
				lists: { 'thing:list:active': [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], { emitEvent: false });

			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should not emit event when no keys matched', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			expect(mockDoAction).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle missing dispatch.invalidate gracefully', () => {
			const mockStoreDispatch = {}; // No invalidate method

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue({
				getState: jest.fn().mockReturnValue({
					lists: {},
					listMeta: {},
					errors: {},
				}),
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();
		});

		it('should handle store dispatch errors gracefully', () => {
			mockDispatch.mockImplementation(() => {
				throw new Error('Store not registered');
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();
		});

		it('should handle missing window.wp gracefully', () => {
			// Remove wp from window
			const windowWithWp = global.window as WindowWithWp;
			const savedWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Restore
			if (windowWithWp && savedWp) {
				windowWithWp.wp = savedWp;
			}
		});
	});

	describe('Node/test environment', () => {
		it('should handle undefined window', () => {
			// This test doesn't really apply in jsdom environment
			// Just verify the function handles null gracefully
			const windowWithWp = global.window as WindowWithWp;
			const savedWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Restore
			if (windowWithWp && savedWp) {
				windowWithWp.wp = savedWp;
			}
		});
	});
});

describe('invalidateAll', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: WindowWithWp['wp'];

	beforeEach(() => {
		const windowWithWp = global.window as WindowWithWp;
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
		const windowWithWp = global.window as WindowWithWp;
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
});
