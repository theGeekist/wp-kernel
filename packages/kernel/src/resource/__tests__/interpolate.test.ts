/**
 * Tests for REST path interpolation
 */

import { interpolatePath, extractPathParams } from '../interpolate';
import { KernelError } from '../../errors';

describe('interpolatePath', () => {
	describe('basic interpolation', () => {
		it('should replace single :id parameter', () => {
			const result = interpolatePath('/gk/v1/things/:id', { id: 123 });
			expect(result).toBe('/gk/v1/things/123');
		});

		it('should replace multiple parameters', () => {
			const result = interpolatePath(
				'/gk/v1/things/:id/comments/:commentId',
				{ id: 42, commentId: 99 }
			);
			expect(result).toBe('/gk/v1/things/42/comments/99');
		});

		it('should handle string values', () => {
			const result = interpolatePath('/gk/v1/things/:slug', {
				slug: 'my-thing',
			});
			expect(result).toBe('/gk/v1/things/my-thing');
		});

		it('should handle boolean values', () => {
			const result = interpolatePath('/gk/v1/flags/:enabled', {
				enabled: true,
			});
			expect(result).toBe('/gk/v1/flags/true');
		});

		it('should handle zero as a valid value', () => {
			const result = interpolatePath('/gk/v1/things/:id', { id: 0 });
			expect(result).toBe('/gk/v1/things/0');
		});

		it('should not replace non-parameter colons', () => {
			const result = interpolatePath('/gk/v1/things/:id?time=12:30:00', {
				id: 123,
			});
			expect(result).toBe('/gk/v1/things/123?time=12:30:00');
		});
	});

	describe('parameter names', () => {
		it('should support camelCase parameter names', () => {
			const result = interpolatePath('/gk/v1/:thingId/sub/:subId', {
				thingId: 1,
				subId: 2,
			});
			expect(result).toBe('/gk/v1/1/sub/2');
		});

		it('should support snake_case parameter names', () => {
			const result = interpolatePath('/gk/v1/:thing_id', {
				thing_id: 123,
			});
			expect(result).toBe('/gk/v1/123');
		});

		it('should support dollar signs in parameter names', () => {
			const result = interpolatePath('/gk/v1/:$id', { $id: 123 });
			expect(result).toBe('/gk/v1/123');
		});
	});

	describe('error cases', () => {
		it('should throw DeveloperError when required param is missing', () => {
			expect(() => {
				interpolatePath('/gk/v1/things/:id', {});
			}).toThrow(KernelError);
		});

		it('should throw DeveloperError with correct error code', () => {
			try {
				interpolatePath('/gk/v1/things/:id', {});
				fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(KernelError);
				const error = e as KernelError;
				expect(error.code).toBe('DeveloperError');
			}
		});

		it('should include missing param names in error message', () => {
			try {
				interpolatePath('/gk/v1/things/:id/comments/:commentId', {
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
				interpolatePath('/gk/v1/things/:id', { id: null as never });
			}).toThrow(KernelError);
		});

		it('should throw when param is undefined', () => {
			expect(() => {
				interpolatePath('/gk/v1/things/:id', {
					id: undefined as never,
				});
			}).toThrow(KernelError);
		});

		it('should list all missing params when multiple are missing', () => {
			try {
				interpolatePath('/gk/v1/things/:id/sub/:subId/item/:itemId', {
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
				interpolatePath('/gk/v1/things/:id', {});
				fail('Should have thrown');
			} catch (e) {
				const error = e as KernelError;
				expect(error.data?.path).toBe('/gk/v1/things/:id');
				expect(error.data?.requiredParams).toEqual(['id']);
				expect(error.data?.providedParams).toEqual([]);
				expect(error.data?.missingParams).toEqual(['id']);
			}
		});
	});

	describe('edge cases', () => {
		it('should handle path with no parameters', () => {
			const result = interpolatePath('/gk/v1/things', {});
			expect(result).toBe('/gk/v1/things');
		});

		it('should handle empty params object with no-param path', () => {
			const result = interpolatePath('/gk/v1/things', {});
			expect(result).toBe('/gk/v1/things');
		});

		it('should ignore extra params not in path', () => {
			const result = interpolatePath('/gk/v1/things/:id', {
				id: 123,
				extra: 'ignored',
			});
			expect(result).toBe('/gk/v1/things/123');
		});

		it('should handle param at start of path', () => {
			const result = interpolatePath(':id/things', { id: 123 });
			expect(result).toBe('123/things');
		});

		it('should handle param at end of path', () => {
			const result = interpolatePath('/gk/v1/:id', { id: 123 });
			expect(result).toBe('/gk/v1/123');
		});

		it('should handle adjacent parameters', () => {
			const result = interpolatePath('/:id:subId', { id: 1, subId: 2 });
			expect(result).toBe('/12');
		});
	});
});

describe('extractPathParams', () => {
	it('should extract single parameter', () => {
		const params = extractPathParams('/gk/v1/things/:id');
		expect(params).toEqual(['id']);
	});

	it('should extract multiple parameters', () => {
		const params = extractPathParams(
			'/gk/v1/things/:id/comments/:commentId'
		);
		expect(params).toEqual(['id', 'commentId']);
	});

	it('should return empty array for path with no parameters', () => {
		const params = extractPathParams('/gk/v1/things');
		expect(params).toEqual([]);
	});

	it('should handle camelCase parameter names', () => {
		const params = extractPathParams('/gk/v1/:thingId/sub/:subItemId');
		expect(params).toEqual(['thingId', 'subItemId']);
	});

	it('should handle snake_case parameter names', () => {
		const params = extractPathParams('/gk/v1/:thing_id');
		expect(params).toEqual(['thing_id']);
	});

	it('should handle dollar signs', () => {
		const params = extractPathParams('/gk/v1/:$id');
		expect(params).toEqual(['$id']);
	});

	it('should preserve parameter order', () => {
		const params = extractPathParams('/gk/:a/:b/:c/:d');
		expect(params).toEqual(['a', 'b', 'c', 'd']);
	});
});
