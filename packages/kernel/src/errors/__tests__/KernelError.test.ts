/**
 * Tests for KernelError base class
 */

import { KernelError } from '../KernelError';
import type { SerializedError } from '../types';

describe('KernelError', () => {
	describe('constructor', () => {
		it('creates error with code and default message', () => {
			const error = new KernelError('ValidationError');

			expect(error.code).toBe('ValidationError');
			expect(error.message).toBe('Validation failed');
			expect(error.name).toBe('KernelError');
			expect(error.data).toBeUndefined();
			expect(error.context).toBeUndefined();
		});

		it('creates error with custom message', () => {
			const error = new KernelError('PolicyDenied', {
				message: 'User lacks required capability',
			});

			expect(error.code).toBe('PolicyDenied');
			expect(error.message).toBe('User lacks required capability');
		});

		it('creates error with data and context', () => {
			const error = new KernelError('TransportError', {
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
			const error = new KernelError('ValidationError');

			expect(error).toBeInstanceOf(KernelError);
			expect(error).toBeInstanceOf(Error);
		});

		it('captures stack trace', () => {
			const error = new KernelError('ValidationError');

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('KernelError');
		});
	});

	describe('toJSON', () => {
		it('serializes error to JSON-safe format', () => {
			const error = new KernelError('ValidationError', {
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
				name: 'KernelError',
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
			const error = new KernelError('TimeoutError');
			const json = error.toJSON();

			expect(json.data).toBeUndefined();
			expect(json.context).toBeUndefined();
		});
	});

	describe('fromJSON', () => {
		it('deserializes error from JSON format', () => {
			const serialized: SerializedError = {
				name: 'KernelError',
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

			const error = KernelError.fromJSON(serialized);

			expect(error).toBeInstanceOf(KernelError);
			expect(error.code).toBe('PolicyDenied');
			expect(error.message).toBe('Permission denied');
			expect(error.data).toEqual({ policyKey: 'things.manage' });
			expect(error.context).toEqual({ userId: 42, siteId: 1 });
			expect(error.stack).toBe('Error stack trace');
		});

		it('handles missing stack trace', () => {
			const serialized: SerializedError = {
				name: 'KernelError',
				code: 'UnknownError',
				message: 'Something went wrong',
			};

			const error = KernelError.fromJSON(serialized);

			expect(error).toBeInstanceOf(KernelError);
			expect(error.stack).toBeDefined(); // New stack is generated
		});
	});

	describe('isKernelError', () => {
		it('returns true for KernelError instances', () => {
			const error = new KernelError('ValidationError');

			expect(KernelError.isKernelError(error)).toBe(true);
		});

		it('returns false for native Error', () => {
			const error = new Error('Native error');

			expect(KernelError.isKernelError(error)).toBe(false);
		});

		it('returns false for non-error values', () => {
			expect(KernelError.isKernelError(null)).toBe(false);
			expect(KernelError.isKernelError(undefined)).toBe(false);
			expect(KernelError.isKernelError('string')).toBe(false);
			expect(KernelError.isKernelError(123)).toBe(false);
			expect(KernelError.isKernelError({})).toBe(false);
		});
	});

	describe('wrap', () => {
		it('wraps native Error into KernelError', () => {
			const nativeError = new Error('Something broke');
			const wrapped = KernelError.wrap(nativeError);

			expect(wrapped).toBeInstanceOf(KernelError);
			expect(wrapped.code).toBe('UnknownError');
			expect(wrapped.message).toBe('Something broke');
			expect(wrapped.data?.originalError).toBe(nativeError);
		});

		it('wraps with custom error code', () => {
			const nativeError = new Error('Network issue');
			const wrapped = KernelError.wrap(nativeError, 'TransportError');

			expect(wrapped.code).toBe('TransportError');
		});

		it('wraps with additional context', () => {
			const nativeError = new Error('Timeout');
			const wrapped = KernelError.wrap(nativeError, 'TimeoutError', {
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
				const error = new KernelError(code);

				expect(error.code).toBe(code);
				expect(error.message).toBeDefined();
				expect(error.message.length).toBeGreaterThan(0);
			});
		});
	});
});
