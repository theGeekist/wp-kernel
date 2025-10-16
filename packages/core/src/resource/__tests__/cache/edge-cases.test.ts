/**
 * @file Cache Utilities Tests - Edge Cases
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidate, invalidateAll, normalizeCacheKey } from '../../cache';
import { KernelEventBus, setKernelEventBus } from '../../../events/bus';
import { setKernelReporter, clearKernelReporter } from '../../../reporter';
import type { Reporter } from '../../../reporter';
import {
	createResourceDataHarness,
	withWordPressData,
	type ResourceHarnessSetup,
} from '../../../../tests/resource.test-support';

describe('cache helper functions', () => {
	describe('normalizeCacheKey', () => {
		it('should handle empty pattern resulting in empty string', () => {
			const result = normalizeCacheKey([]);
			expect(result).toBe('');
		});

		it('should filter out all nulls and undefineds leaving empty string', () => {
			const result = normalizeCacheKey([null, undefined]);
			expect(result).toBe('');
		});
	});
});

describe('invalidate edge cases', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let harnessSetup: ResourceHarnessSetup;
	let bus: KernelEventBus;
	let cacheListener: jest.Mock;
	let originalNodeEnv: string | undefined;
	let reporterLogs: LogEntry[];
	let reporter: Reporter;

	beforeEach(() => {
		// Store originals
		originalNodeEnv = process.env.NODE_ENV;

		({ reporter, logs: reporterLogs } = createReporterSpy());
		setKernelReporter(reporter);

		// Create mocks
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		bus = new KernelEventBus();
		setKernelEventBus(bus);
		cacheListener = jest.fn();
		bus.on('cache:invalidated', cacheListener);

		harnessSetup = createResourceDataHarness({
			data: {
				dispatch: mockDispatch,
				select: mockSelect,
			},
		});
	});

	afterEach(() => {
		// Restore originals
		if (originalNodeEnv) {
			process.env.NODE_ENV = originalNodeEnv;
		} else {
			delete process.env.NODE_ENV;
		}

		clearKernelReporter();
		setKernelEventBus(new KernelEventBus());
		jest.clearAllMocks();
		harnessSetup.harness.teardown();
	});

	type LogEntry = {
		level: 'debug' | 'info' | 'warn' | 'error';
		message: string;
		context?: unknown;
	};

	function createReporterSpy(): { reporter: Reporter; logs: LogEntry[] } {
		const logs: LogEntry[] = [];
		const spyReporter: Reporter = {
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
				return spyReporter;
			},
		};

		return { reporter: spyReporter, logs };
	}

	describe('development environment warnings', () => {
		it('should log warning when store does not expose __getInternalState in development', () => {
			process.env.NODE_ENV = 'development';

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				// No __getInternalState selector
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw, but should log warning
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();

			expect(reporterLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'warn',
						message: 'cache.store.missingState',
					}),
				])
			);
		});

		it('should log warning when invalidateAll fails in development', () => {
			process.env.NODE_ENV = 'development';

			const mockStoreDispatch = {
				invalidateAll: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw, but should log warning
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			expect(reporterLogs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'error',
						message: 'cache.store.invalidate.failure',
					}),
				])
			);
		});

		it('should not log warning when invalidate fails in production', () => {
			process.env.NODE_ENV = 'production';

			const mockStoreDispatch = {
				invalidate: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: { 'thing:list': [1, 2] },
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw or log
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();

			expect(reporterLogs).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({
						message: 'cache.store.invalidate.failure',
					}),
				])
			);
		});

		it('should not log warning when invalidateAll fails in production', () => {
			process.env.NODE_ENV = 'production';

			const mockStoreDispatch = {
				invalidateAll: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			const override = createReporterSpy();
			setKernelReporter(override.reporter);

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw or log
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			expect(override.logs).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({
						message: 'cache.store.invalidate.failure',
					}),
				])
			);
		});
	});

	describe('event emission edge cases', () => {
		it('should not emit event when emitEvent is false', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: { 'thing:list': [1, 2] },
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], {
				storeKey: 'wpk/thing',
				emitEvent: false,
			});

			expect(cacheListener).not.toHaveBeenCalled();
		});

		it('should not emit event when no keys were invalidated', () => {
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

			invalidate(['thing', 'list'], {
				storeKey: 'wpk/thing',
				emitEvent: true,
			});

			expect(cacheListener).not.toHaveBeenCalled();
		});

		it('should handle missing window.wp.hooks gracefully', async () => {
			await withWordPressData({ hooks: null }, () => {
				const mockStoreDispatch = {
					invalidate: jest.fn(),
				};

				const mockStoreSelect = {
					getState: jest.fn().mockReturnValue({
						lists: { 'thing:list': [1, 2] },
						listMeta: {},
						errors: {},
					}),
				};

				mockDispatch.mockReturnValue(mockStoreDispatch);
				mockSelect.mockReturnValue(mockStoreSelect);

				// Should not throw when hooks is undefined
				expect(() => {
					invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
				}).not.toThrow();
			});
		});
	});

	describe('invalidateAll edge cases', () => {
		it('should handle missing invalidateAll method', () => {
			const mockStoreDispatch = {
				// No invalidateAll method
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			// Should not emit event
			expect(cacheListener).not.toHaveBeenCalled();
		});

		it('should emit event with wildcard when invalidateAll succeeds', () => {
			const mockStoreDispatch = {
				invalidateAll: jest.fn(),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			invalidateAll('wpk/thing');

			expect(mockStoreDispatch.invalidateAll).toHaveBeenCalled();
			expect(cacheListener).toHaveBeenCalledWith({
				keys: ['wpk/thing:*'],
			});
		});
	});
});
