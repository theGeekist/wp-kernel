/**
 * @file Cache Utilities Tests - Invalidate
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidate, registerStoreKey } from '../../cache';
import { setWPKernelEventBus, WPKernelEventBus } from '../../../events/bus';
import { setWPKernelReporter, clearWPKReporter } from '../../../reporter';
import type { Reporter } from '../../../reporter';
import type { WPKernelRegistry } from '../../../data/types';
import * as reporterResolution from '../../../reporter/resolve';
import {
	createResourceDataHarness,
	withWordPressData,
	type ResourceHarnessSetup,
} from '../../../../tests/resource.test-support';

describe('invalidate', () => {
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

		// Register test store keys
		registerStoreKey('wpk/thing');
		registerStoreKey('wpk/job');
		clearWPKReporter();
		reporterResolution.resetReporterResolution();
	});

	afterEach(() => {
		setWPKernelEventBus(new WPKernelEventBus());
		jest.clearAllMocks();
		clearWPKReporter();
		harnessSetup.harness.teardown();
		reporterResolution.resetReporterResolution();
	});

	function createReporterSpy(): { reporter: Reporter; logs: LogEntry[] } {
		const logs: LogEntry[] = [];
		const reporter: Reporter = {
			info(message, context) {
				logs.push({ level: 'info', message, context });
			},
			warn(message, context) {
				logs.push({ level: 'warn', message, context });
			},
			error(message, context) {
				logs.push({ level: 'error', message, context });
			},
			debug(message, context) {
				logs.push({ level: 'debug', message, context });
			},
			child() {
				return reporter;
			},
		};

		return { reporter, logs };
	}

	type LogEntry = {
		level: 'debug' | 'info' | 'warn' | 'error';
		message: string;
		context?: unknown;
	};

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

			// Should emit event with NORMALIZED keys via event bus
			expect(cacheListener).toHaveBeenCalledWith({
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

	describe('reporter instrumentation', () => {
		it('uses WPKernel reporter when no override provided', () => {
			const { reporter, logs } = createReporterSpy();
			setWPKernelReporter(reporter);

			const mockState = {
				lists: {
					active: [1, 2],
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

			invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });

			expect(logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'debug',
						message: 'cache.invalidate.request',
					}),
					expect.objectContaining({
						level: 'info',
						message: 'cache.invalidate.match',
					}),
					expect.objectContaining({
						level: 'info',
						message: 'cache.invalidate.summary',
					}),
				])
			);
		});

		it('prefers explicit reporter override', () => {
			const wpKernelSpy = createReporterSpy();
			const overrideSpy = createReporterSpy();
			setWPKernelReporter(wpKernelSpy.reporter);

			const mockState = {
				lists: {
					active: [1, 2],
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

			invalidate(['thing', 'list'], {
				storeKey: 'wpk/thing',
				reporter: overrideSpy.reporter,
			});

			expect(overrideSpy.logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: 'cache.invalidate.match',
					}),
				])
			);
			expect(wpKernelSpy.logs).toEqual([]);
		});

		it('respects silent reporter flag when no override provided', () => {
			const resolveSpy = jest.spyOn(
				reporterResolution,
				'resolveReporter'
			);

			const originalSilent = process.env.WPK_SILENT_REPORTERS;
			process.env.WPK_SILENT_REPORTERS = '1';

			const registry = {
				dispatch: () => ({ invalidate: jest.fn() }),
				select: () => ({
					__getInternalState: jest.fn().mockReturnValue({
						lists: {},
						listMeta: {},
						errors: {},
					}),
				}),
			};

			try {
				invalidate(['thing', 'list'], {
					storeKey: 'wpk/thing',
					registry: registry as unknown as WPKernelRegistry,
				});

				expect(resolveSpy).toHaveBeenCalled();

				const lastResult = resolveSpy.mock.results.at(-1)?.value;
				expect(lastResult).toBe(reporterResolution.getSilentReporter());
			} finally {
				if (originalSilent) {
					process.env.WPK_SILENT_REPORTERS = originalSilent;
				} else {
					delete process.env.WPK_SILENT_REPORTERS;
				}

				resolveSpy.mockRestore();
			}
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

			expect(cacheListener).toHaveBeenCalledWith(
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

			expect(cacheListener).not.toHaveBeenCalled();
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

			expect(cacheListener).not.toHaveBeenCalled();
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

		it('should handle missing window.wp gracefully', async () => {
			await withWordPressData({ wp: null }, () => {
				expect(() => {
					invalidate(['thing', 'list']);
				}).not.toThrow();
			});
		});
	});

	describe('Node/test environment', () => {
		it('should handle undefined window', async () => {
			await withWordPressData({ wp: null }, () => {
				expect(() => {
					invalidate(['thing', 'list']);
				}).not.toThrow();
			});
		});
	});

	describe('helper function branches', () => {
		it('should handle stores with no __getInternalState selector', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				// No __getInternalState method
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw, just skip that store
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// invalidate should not be called since we couldn't get state
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle __getInternalState that is not a function', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: 'not-a-function', // Wrong type
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// invalidate should not be called
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle dispatch without invalidateResolution method', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				// No invalidateResolution method
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Should still call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle item keys and invalidate getItem resolution', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {
					'thing:item:123': 'Some error',
				},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				invalidateResolution: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate with pattern that matches item
			invalidate(['thing', 'item']);

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should call invalidateResolution for getItem
			expect(mockStoreDispatch.invalidateResolution).toHaveBeenCalledWith(
				'getItem'
			);
		});

		it('should preserve existing listMeta mappings when already present', () => {
			const mockState = {
				lists: {
					active: [1, 2],
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

			invalidate(['thing', 'list']);

			// Should still work correctly
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle lists and listMeta with same queryKey (normalized mapping preserved)', () => {
			// When both lists and listMeta have the same key, the mapping should be preserved
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {
					active: { total: 2 }, // Same key as in lists
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

			invalidate(['thing', 'list']);

			// Should only invalidate once per unique queryKey
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle listMeta-only keys (lists empty)', () => {
			// When lists is empty but listMeta has keys
			const mockState = {
				lists: {}, // Empty
				listMeta: {
					active: { total: 0 }, // Has key but lists doesn't
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

			invalidate(['thing', 'list']);

			// Should still invalidate the listMeta key
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle empty pattern in findMatchingNormalizedKeys', () => {
			const mockState = {
				lists: {
					active: [1, 2],
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

			// Pass pattern that will result in empty normalized pattern
			invalidate([null, undefined]);

			// Should not match anything
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle matching keys that do NOT start with listPrefix (no getList invalidation)', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {
					'thing:error:123': 'Some error', // Doesn't start with list or item prefix
				},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				invalidateResolution: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// This pattern will match the error key but not trigger list/item resolution invalidation
			invalidate(['thing', 'error']);

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should NOT call invalidateResolution for getList or getItem
			// because the keys don't start with list or item prefix
			expect(
				mockStoreDispatch.invalidateResolution
			).not.toHaveBeenCalled();
		});

		it('should handle error during processStoreInvalidation gracefully in development', () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			const { reporter, logs } = createReporterSpy();
			setWPKernelReporter(reporter);

			mockDispatch.mockImplementation(() => {
				throw new Error('Store explosion!');
			});

			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			expect(logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'error',
						message: 'cache.store.invalidate.failure',
					}),
				])
			);

			process.env.NODE_ENV = originalEnv;
		});

		it('should handle error during processStoreInvalidation silently in production', () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const { reporter, logs } = createReporterSpy();
			setWPKernelReporter(reporter);

			mockDispatch.mockImplementation(() => {
				throw new Error('Store explosion!');
			});

			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			expect(logs).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({
						message: 'cache.store.invalidate.failure',
					}),
				])
			);

			process.env.NODE_ENV = originalEnv;
		});

		it('should skip emitting event when emitEvent is false', () => {
			const mockState = {
				lists: {
					active: [1, 2],
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

			invalidate(['thing', 'list'], { emitEvent: false });

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should NOT emit event
			expect(cacheListener).not.toHaveBeenCalled();
		});

		it('should skip emitting event when no keys were invalidated', () => {
			const mockState = {
				lists: {},
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

			// Should NOT emit event (no keys matched)
			expect(cacheListener).not.toHaveBeenCalled();
		});

		it('should handle getMatchingStoreKeys with empty prefix', () => {
			const mockState = {
				lists: {
					active: [1, 2],
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

			// Invalidate without storeKey option (will match all registered stores)
			invalidate(['thing', 'list']);

			// Should have been called for registered stores
			expect(mockDispatch).toHaveBeenCalled();
		});

		it('should filter stores by prefix when storeKey is provided', () => {
			const mockState = {
				lists: {
					active: [1, 2],
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

			// Invalidate with specific storeKey (uses prefix filtering)
			invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });

			// Should have been called only for the specific store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
		});
	});
});
