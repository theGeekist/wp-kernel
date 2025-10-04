/**
 * @file Cache Utilities Tests - Invalidate
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidate, registerStoreKey } from '../../cache';

// Use global types for window.wp

describe('invalidate', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
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
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		jest.clearAllMocks();
	});

	describe('basic invalidation', () => {
		it('should invalidate matching cache keys in a store', () => {
			// State has RAW keys (as stored by reducer)
			const mockState = {
				lists: {
					active: [1, 2],
					inactive: [3, 4],
				},
				listMeta: {
					active: { total: 2 },
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate all 'thing' list queries
			invalidate(['thing', 'list']);

			// Should call invalidate on wpk/thing store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			// dispatch.invalidate should receive RAW keys (as reducer expects)
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
				'inactive',
			]);

			// Should emit event with NORMALIZED keys
			expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
				keys: expect.arrayContaining([
					'thing:list:active',
					'thing:list:inactive',
				]),
			});
		});

		it('should handle exact key matches', () => {
			// State has RAW keys
			const mockState = {
				lists: {
					active: [1, 2],
					'active:page:2': [3, 4],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate specific query
			invalidate(['thing', 'list', 'active']);

			// dispatch.invalidate receives RAW keys
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
				'active:page:2',
			]);
		});

		it('should handle multiple pattern arrays', () => {
			// State has RAW keys
			const mockState = {
				lists: {
					active: [1, 2],
				},
				items: {
					'123': { id: 123 },
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate multiple patterns
			invalidate([
				['thing', 'list'],
				['thing', 'item'],
			]);

			// dispatch.invalidate receives RAW keys
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith(
				expect.arrayContaining(['active'])
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
			// State has RAW keys
			const mockState = {
				lists: { active: [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Event is emitted with NORMALIZED keys
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
			const windowWithWp = global.window as Window & { wp?: any };
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
			const windowWithWp = global.window as Window & { wp?: any };
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
