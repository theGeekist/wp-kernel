/**
 * @file Cache Utilities Tests
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

/**
 * @file Cache Key Utilities Tests
 */

import {
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
	type CacheKeyPattern,
} from '../cache.js';

describe('cacheKeys', () => {
	describe('normalizeCacheKey', () => {
		it('should normalize simple cache keys', () => {
			expect(normalizeCacheKey(['thing', 'list'])).toBe('thing:list');
			expect(normalizeCacheKey(['thing', 'get', 123])).toBe(
				'thing:get:123'
			);
			expect(normalizeCacheKey(['job', 'list', 'open'])).toBe(
				'job:list:open'
			);
		});

		it('should filter out null and undefined values', () => {
			expect(normalizeCacheKey(['thing', 'list', null])).toBe(
				'thing:list'
			);
			expect(normalizeCacheKey(['thing', 'list', undefined])).toBe(
				'thing:list'
			);
			expect(
				normalizeCacheKey(['thing', 'list', null, undefined, 'active'])
			).toBe('thing:list:active');
		});

		it('should handle boolean values', () => {
			expect(normalizeCacheKey(['thing', 'list', true])).toBe(
				'thing:list:true'
			);
			expect(normalizeCacheKey(['thing', 'list', false])).toBe(
				'thing:list:false'
			);
		});

		it('should handle numeric values', () => {
			expect(normalizeCacheKey(['thing', 'page', 1])).toBe(
				'thing:page:1'
			);
			expect(normalizeCacheKey(['thing', 'page', 0])).toBe(
				'thing:page:0'
			);
		});

		it('should handle empty patterns', () => {
			expect(normalizeCacheKey([])).toBe('');
			expect(normalizeCacheKey([null, undefined])).toBe('');
		});

		it('should be deterministic', () => {
			const pattern: CacheKeyPattern = ['thing', 'list', 'active'];
			const result1 = normalizeCacheKey(pattern);
			const result2 = normalizeCacheKey(pattern);
			expect(result1).toBe(result2);
		});
	});

	describe('matchesCacheKey', () => {
		it('should match exact keys', () => {
			expect(matchesCacheKey('thing:list', ['thing', 'list'])).toBe(true);
			expect(
				matchesCacheKey('thing:list:active', [
					'thing',
					'list',
					'active',
				])
			).toBe(true);
			expect(
				matchesCacheKey('thing:get:123', ['thing', 'get', 123])
			).toBe(true);
		});

		it('should match prefixes', () => {
			// 'thing:list' pattern should match all list queries
			expect(
				matchesCacheKey('thing:list:active', ['thing', 'list'])
			).toBe(true);
			expect(
				matchesCacheKey('thing:list:inactive', ['thing', 'list'])
			).toBe(true);
			expect(
				matchesCacheKey('thing:list:active:page:2', ['thing', 'list'])
			).toBe(true);
		});

		it('should not match non-prefixes', () => {
			// Should not match different operations
			expect(matchesCacheKey('thing:get:123', ['thing', 'list'])).toBe(
				false
			);
			expect(matchesCacheKey('thing:create', ['thing', 'list'])).toBe(
				false
			);

			// Should not match different resources
			expect(matchesCacheKey('job:list', ['thing', 'list'])).toBe(false);

			// Should not match if pattern is more specific than key
			expect(
				matchesCacheKey('thing:list', ['thing', 'list', 'active'])
			).toBe(false);
		});

		it('should not match partial segments', () => {
			// 'thing:list' should not match 'thing:listing'
			expect(matchesCacheKey('thing:listing', ['thing', 'list'])).toBe(
				false
			);
			expect(matchesCacheKey('thing:list123', ['thing', 'list'])).toBe(
				false
			);
		});

		it('should return false for empty patterns', () => {
			expect(matchesCacheKey('thing:list', [])).toBe(false);
			expect(matchesCacheKey('thing:list', [null, undefined])).toBe(
				false
			);
		});

		it('should handle patterns with null/undefined', () => {
			// Pattern ['thing', 'list', null] is normalized to 'thing:list'
			expect(
				matchesCacheKey('thing:list:active', ['thing', 'list', null])
			).toBe(true);
			expect(
				matchesCacheKey('thing:list:active', [
					'thing',
					'list',
					undefined,
				])
			).toBe(true);
		});
	});

	describe('findMatchingKeys', () => {
		const keys = [
			'thing:list:active',
			'thing:list:inactive',
			'thing:list:active:page:2',
			'thing:get:123',
			'thing:get:456',
			'job:list:open',
			'job:list:closed',
		];

		it('should find all matching keys for a pattern', () => {
			const matches = findMatchingKeys(keys, ['thing', 'list']);
			expect(matches).toEqual([
				'thing:list:active',
				'thing:list:inactive',
				'thing:list:active:page:2',
			]);
		});

		it('should find exact matches', () => {
			const matches = findMatchingKeys(keys, ['thing', 'list', 'active']);
			expect(matches).toEqual([
				'thing:list:active',
				'thing:list:active:page:2',
			]);
		});

		it('should return empty array when no matches', () => {
			const matches = findMatchingKeys(keys, ['nonexistent', 'resource']);
			expect(matches).toEqual([]);
		});

		it('should work with different resource types', () => {
			const matches = findMatchingKeys(keys, ['job', 'list']);
			expect(matches).toEqual(['job:list:open', 'job:list:closed']);
		});

		it('should handle numeric segments', () => {
			const matches = findMatchingKeys(keys, ['thing', 'get', 123]);
			expect(matches).toEqual(['thing:get:123']);
		});
	});

	describe('findMatchingKeysMultiple', () => {
		const keys = [
			'thing:list:active',
			'thing:list:inactive',
			'thing:get:123',
			'job:list:open',
			'job:list:closed',
			'application:list:pending',
		];

		it('should find matches for multiple patterns', () => {
			const matches = findMatchingKeysMultiple(keys, [
				['thing', 'list'],
				['job', 'list'],
			]);
			expect(matches).toEqual([
				'thing:list:active',
				'thing:list:inactive',
				'job:list:open',
				'job:list:closed',
			]);
		});

		it('should deduplicate overlapping matches', () => {
			// Both patterns match 'thing:list:active'
			const matches = findMatchingKeysMultiple(keys, [
				['thing', 'list'],
				['thing', 'list', 'active'],
			]);
			expect(matches).toEqual([
				'thing:list:active',
				'thing:list:inactive',
			]);
		});

		it('should return empty array when no patterns match', () => {
			const matches = findMatchingKeysMultiple(keys, [
				['nonexistent', 'resource'],
			]);
			expect(matches).toEqual([]);
		});

		it('should handle empty patterns array', () => {
			const matches = findMatchingKeysMultiple(keys, []);
			expect(matches).toEqual([]);
		});

		it('should handle multiple resource types', () => {
			const matches = findMatchingKeysMultiple(keys, [
				['thing', 'get'],
				['application', 'list'],
			]);
			expect(matches).toEqual([
				'thing:get:123',
				'application:list:pending',
			]);
		});
	});
});

import {
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	registerStoreKey,
} from '../cache.js';
import { KernelError } from '../../error/index.js';

describe('interpolatePath', () => {
	describe('basic interpolation', () => {
		it('should replace single :id parameter', () => {
			const result = interpolatePath('/wpk/v1/things/:id', { id: 123 });
			expect(result).toBe('/wpk/v1/things/123');
		});

		it('should replace multiple parameters', () => {
			const result = interpolatePath(
				'/wpk/v1/things/:id/comments/:commentId',
				{ id: 42, commentId: 99 }
			);
			expect(result).toBe('/wpk/v1/things/42/comments/99');
		});

		it('should handle string values', () => {
			const result = interpolatePath('/wpk/v1/things/:slug', {
				slug: 'my-thing',
			});
			expect(result).toBe('/wpk/v1/things/my-thing');
		});

		it('should handle boolean values', () => {
			const result = interpolatePath('/wpk/v1/flags/:enabled', {
				enabled: true,
			});
			expect(result).toBe('/wpk/v1/flags/true');
		});

		it('should handle zero as a valid value', () => {
			const result = interpolatePath('/wpk/v1/things/:id', { id: 0 });
			expect(result).toBe('/wpk/v1/things/0');
		});

		it('should not replace non-parameter colons', () => {
			const result = interpolatePath('/wpk/v1/things/:id?time=12:30:00', {
				id: 123,
			});
			expect(result).toBe('/wpk/v1/things/123?time=12:30:00');
		});
	});

	describe('parameter names', () => {
		it('should support camelCase parameter names', () => {
			const result = interpolatePath('/wpk/v1/:thingId/sub/:subId', {
				thingId: 1,
				subId: 2,
			});
			expect(result).toBe('/wpk/v1/1/sub/2');
		});

		it('should support snake_case parameter names', () => {
			const result = interpolatePath('/wpk/v1/:thing_id', {
				thing_id: 123,
			});
			expect(result).toBe('/wpk/v1/123');
		});

		it('should support dollar signs in parameter names', () => {
			const result = interpolatePath('/wpk/v1/:$id', { $id: 123 });
			expect(result).toBe('/wpk/v1/123');
		});
	});

	describe('error cases', () => {
		it('should throw DeveloperError when required param is missing', () => {
			expect(() => {
				interpolatePath('/wpk/v1/things/:id', {});
			}).toThrow(KernelError);
		});

		it('should throw DeveloperError with correct error code', () => {
			try {
				interpolatePath('/wpk/v1/things/:id', {});
				fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(KernelError);
				const error = e as KernelError;
				expect(error.code).toBe('DeveloperError');
			}
		});

		it('should include missing param names in error message', () => {
			try {
				interpolatePath('/wpk/v1/things/:id/comments/:commentId', {
					id: 123,
				});
				fail('Should have thrown');
			} catch (e) {
				const error = e as KernelError;
				expect(error.message).toContain('commentId');
			}
		});

		it('should throw when param is null', () => {
			expect(() => {
				interpolatePath('/wpk/v1/things/:id', { id: null as never });
			}).toThrow(KernelError);
		});

		it('should throw when param is undefined', () => {
			expect(() => {
				interpolatePath('/wpk/v1/things/:id', {
					id: undefined as never,
				});
			}).toThrow(KernelError);
		});

		it('should list all missing params when multiple are missing', () => {
			try {
				interpolatePath('/wpk/v1/things/:id/sub/:subId/item/:itemId', {
					subId: 2,
				});
				fail('Should have thrown');
			} catch (e) {
				const error = e as KernelError;
				expect(error.message).toContain('id');
				expect(error.message).toContain('itemId');
				expect(error.message).not.toContain('subId');
			}
		});

		it('should include context in error data', () => {
			try {
				interpolatePath('/wpk/v1/things/:id', {});
				fail('Should have thrown');
			} catch (e) {
				const error = e as KernelError;
				expect(error.data?.path).toBe('/wpk/v1/things/:id');
				expect(error.data?.requiredParams).toEqual(['id']);
				expect(error.data?.providedParams).toEqual([]);
				expect(error.data?.missingParams).toEqual(['id']);
			}
		});
	});

	describe('edge cases', () => {
		it('should handle path with no parameters', () => {
			const result = interpolatePath('/wpk/v1/things', {});
			expect(result).toBe('/wpk/v1/things');
		});

		it('should handle empty params object with no-param path', () => {
			const result = interpolatePath('/wpk/v1/things', {});
			expect(result).toBe('/wpk/v1/things');
		});

		it('should ignore extra params not in path', () => {
			const result = interpolatePath('/wpk/v1/things/:id', {
				id: 123,
				extra: 'ignored',
			});
			expect(result).toBe('/wpk/v1/things/123');
		});

		it('should handle param at start of path', () => {
			const result = interpolatePath(':id/things', { id: 123 });
			expect(result).toBe('123/things');
		});

		it('should handle param at end of path', () => {
			const result = interpolatePath('/wpk/v1/:id', { id: 123 });
			expect(result).toBe('/wpk/v1/123');
		});

		it('should handle adjacent parameters', () => {
			const result = interpolatePath('/:id:subId', { id: 1, subId: 2 });
			expect(result).toBe('/12');
		});
	});
});

describe('extractPathParams', () => {
	it('should extract single parameter', () => {
		const params = extractPathParams('/wpk/v1/things/:id');
		expect(params).toEqual(['id']);
	});

	it('should extract multiple parameters', () => {
		const params = extractPathParams(
			'/wpk/v1/things/:id/comments/:commentId'
		);
		expect(params).toEqual(['id', 'commentId']);
	});

	it('should return empty array for path with no parameters', () => {
		const params = extractPathParams('/wpk/v1/things');
		expect(params).toEqual([]);
	});

	it('should handle camelCase parameter names', () => {
		const params = extractPathParams('/wpk/v1/:thingId/sub/:subItemId');
		expect(params).toEqual(['thingId', 'subItemId']);
	});

	it('should handle snake_case parameter names', () => {
		const params = extractPathParams('/wpk/v1/:thing_id');
		expect(params).toEqual(['thing_id']);
	});

	it('should handle dollar signs', () => {
		const params = extractPathParams('/wpk/v1/:$id');
		expect(params).toEqual(['$id']);
	});

	it('should preserve parameter order', () => {
		const params = extractPathParams('/wpk/:a/:b/:c/:d');
		expect(params).toEqual(['a', 'b', 'c', 'd']);
	});
});

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

describe('invalidate edge cases', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: WindowWithWp['wp'];
	let originalNodeEnv: string | undefined;
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		// Store originals
		const windowWithWp = global.window as WindowWithWp;
		originalWp = windowWithWp?.wp;
		originalNodeEnv = process.env.NODE_ENV;

		// Spy on console.warn
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

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
	});

	afterEach(() => {
		// Restore originals
		const windowWithWp = global.window as WindowWithWp;
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		if (originalNodeEnv) {
			process.env.NODE_ENV = originalNodeEnv;
		} else {
			delete process.env.NODE_ENV;
		}

		consoleWarnSpy.mockRestore();
		jest.clearAllMocks();
	});

	describe('development environment warnings', () => {
		it('should log warning when invalidate fails in development', () => {
			process.env.NODE_ENV = 'development';

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

			// Should not throw, but should log warning
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to invalidate cache'),
				expect.any(Error)
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

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to invalidate all caches'),
				expect.any(Error)
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

			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});

		it('should not log warning when invalidateAll fails in production', () => {
			process.env.NODE_ENV = 'production';

			const mockStoreDispatch = {
				invalidateAll: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw or log
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			expect(consoleWarnSpy).not.toHaveBeenCalled();
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

			expect(mockDoAction).not.toHaveBeenCalled();
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

			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should handle missing window.wp.hooks gracefully', () => {
			const windowWithWp = global.window as WindowWithWp;
			if (windowWithWp && windowWithWp.wp) {
				delete windowWithWp.wp.hooks;
			}

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
			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should emit event with wildcard when invalidateAll succeeds', () => {
			const mockStoreDispatch = {
				invalidateAll: jest.fn(),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			invalidateAll('wpk/thing');

			expect(mockStoreDispatch.invalidateAll).toHaveBeenCalled();
			expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
				keys: ['wpk/thing:*'],
			});
		});
	});
});
