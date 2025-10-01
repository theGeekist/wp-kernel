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
