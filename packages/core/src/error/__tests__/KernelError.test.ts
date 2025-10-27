/**
 * Tests for WPKernelError base class
 */

import { WPKernelError } from '../WPKernelError';
import type { SerializedError } from '../types';

describe('WPKernelError', () => {
	describe('constructor', () => {
		it('creates error with code and default message', () => {
			const error = new WPKernelError('ValidationError');

			expect(error.code).toBe('ValidationError');
			expect(error.message).toBe('Validation failed');
			expect(error.name).toBe('WPKernelError');
			expect(error.data).toBeUndefined();
			expect(error.context).toBeUndefined();
		});

		it('creates error with custom message', () => {
			const error = new WPKernelError('PolicyDenied', {
				message: 'User lacks required capability',
			});

			expect(error.code).toBe('PolicyDenied');
			expect(error.message).toBe('User lacks required capability');
		});

		it('creates error with data and context', () => {
			const error = new WPKernelError('TransportError', {
				message: 'Request failed',
				data: {
					serverCode: 'rest_error',
				},
				context: {
					path: '/wpk/v1/things',
					method: 'GET',
					requestId: 'abc-123',
				},
			});

			expect(error.data).toEqual({
				serverCode: 'rest_error',
			});
			expect(error.context).toEqual({
				path: '/wpk/v1/things',
				method: 'GET',
				requestId: 'abc-123',
			});
		});

		it('maintains proper prototype chain', () => {
			const error = new WPKernelError('ValidationError');

			expect(error).toBeInstanceOf(WPKernelError);
			expect(error).toBeInstanceOf(Error);
		});

		it('captures stack trace', () => {
			const error = new WPKernelError('ValidationError');

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('WPKernelError');
		});
	});

	describe('toJSON', () => {
		it('serializes error to JSON-safe format', () => {
			const error = new WPKernelError('ValidationError', {
				message: 'Invalid input',
				data: {
					validationErrors: [
						{ field: 'email', message: 'Invalid email format' },
					],
				},
				context: {
					resourceName: 'thing',
					requestId: 'xyz-789',
				},
			});

			const json = error.toJSON();

			expect(json).toEqual({
				name: 'WPKernelError',
				code: 'ValidationError',
				message: 'Invalid input',
				data: {
					validationErrors: [
						{ field: 'email', message: 'Invalid email format' },
					],
				},
				context: {
					resourceName: 'thing',
					requestId: 'xyz-789',
				},
				stack: expect.any(String),
			});
		});

		it('handles undefined data and context', () => {
			const error = new WPKernelError('TimeoutError');
			const json = error.toJSON();

			expect(json.data).toBeUndefined();
			expect(json.context).toBeUndefined();
		});
	});

	describe('fromJSON', () => {
		it('deserializes error from JSON format', () => {
			const serialized: SerializedError = {
				name: 'WPKernelError',
				code: 'PolicyDenied',
				message: 'Permission denied',
				data: {
					policyKey: 'things.manage',
				},
				context: {
					userId: 42,
					siteId: 1,
				},
				stack: 'Error stack trace',
			};

			const error = WPKernelError.fromJSON(serialized);

			expect(error).toBeInstanceOf(WPKernelError);
			expect(error.code).toBe('PolicyDenied');
			expect(error.message).toBe('Permission denied');
			expect(error.data).toEqual({ policyKey: 'things.manage' });
			expect(error.context).toEqual({ userId: 42, siteId: 1 });
			expect(error.stack).toBe('Error stack trace');
		});

		it('handles missing stack trace', () => {
			const serialized: SerializedError = {
				name: 'WPKernelError',
				code: 'UnknownError',
				message: 'Something went wrong',
			};

			const error = WPKernelError.fromJSON(serialized);

			expect(error).toBeInstanceOf(WPKernelError);
			expect(error.stack).toBeDefined(); // New stack is generated
		});
	});

	describe('isWPKernelError', () => {
		it('returns true for WPKernelError instances', () => {
			const error = new WPKernelError('ValidationError');

			expect(WPKernelError.isWPKernelError(error)).toBe(true);
		});

		it('returns false for native Error', () => {
			const error = new Error('Native error');

			expect(WPKernelError.isWPKernelError(error)).toBe(false);
		});

		it('returns false for non-error values', () => {
			expect(WPKernelError.isWPKernelError(null)).toBe(false);
			expect(WPKernelError.isWPKernelError(undefined)).toBe(false);
			expect(WPKernelError.isWPKernelError('string')).toBe(false);
			expect(WPKernelError.isWPKernelError(123)).toBe(false);
			expect(WPKernelError.isWPKernelError({})).toBe(false);
		});
	});

	describe('wrap', () => {
		it('wraps native Error into WPKernelError', () => {
			const nativeError = new Error('Something broke');
			const wrapped = WPKernelError.wrap(nativeError);

			expect(wrapped).toBeInstanceOf(WPKernelError);
			expect(wrapped.code).toBe('UnknownError');
			expect(wrapped.message).toBe('Something broke');
			expect(wrapped.data?.originalError).toBe(nativeError);
		});

		it('wraps with custom error code', () => {
			const nativeError = new Error('Network issue');
			const wrapped = WPKernelError.wrap(nativeError, 'TransportError');

			expect(wrapped.code).toBe('TransportError');
		});

		it('wraps with additional context', () => {
			const nativeError = new Error('Timeout');
			const wrapped = WPKernelError.wrap(nativeError, 'TimeoutError', {
				path: '/wpk/v1/things',
				requestId: 'abc-123',
			});

			expect(wrapped.context).toEqual({
				path: '/wpk/v1/things',
				requestId: 'abc-123',
			});
		});
	});

	describe('error codes', () => {
		const codes = [
			'TransportError',
			'ServerError',
			'PolicyDenied',
			'ValidationError',
			'TimeoutError',
			'NotImplementedError',
			'DeveloperError',
			'DeprecatedError',
			'UnknownError',
		] as const;

		codes.forEach((code) => {
			it(`creates error with code: ${code}`, () => {
				const error = new WPKernelError(code);

				expect(error.code).toBe(code);
				expect(error.message).toBeDefined();
				expect(error.message.length).toBeGreaterThan(0);
			});
		});

		it('uses fallback message for invalid error code', () => {
			// TypeScript will complain, but we want to test runtime behavior
			const error = new WPKernelError('InvalidCode' as 'ValidationError');

			expect(error.code).toBe('InvalidCode');
			expect(error.message).toBe('An error occurred');
		});
	});

	describe('Error.captureStackTrace', () => {
		it('uses Error.captureStackTrace when available', () => {
			// Save original
			const originalCaptureStackTrace = Error.captureStackTrace;

			// Mock it
			const mockCaptureStackTrace = jest.fn();
			Error.captureStackTrace = mockCaptureStackTrace;

			const error = new WPKernelError('ValidationError');

			expect(mockCaptureStackTrace).toHaveBeenCalledWith(
				error,
				WPKernelError
			);

			// Restore
			Error.captureStackTrace = originalCaptureStackTrace;
		});

		it('works when Error.captureStackTrace is undefined', () => {
			// Save original
			const originalCaptureStackTrace = Error.captureStackTrace;

			// Remove it
			Error.captureStackTrace = undefined as any;

			// Should not throw
			expect(() => {
				new WPKernelError('ValidationError');
			}).not.toThrow();

			// Restore
			Error.captureStackTrace = originalCaptureStackTrace;
		});
	});
});
