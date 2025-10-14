/**
 * Tests for TransportError
 */

import { TransportError } from '../TransportError';
import { KernelError } from '../KernelError';

describe('TransportError', () => {
	describe('constructor', () => {
		it('creates transport error with required fields', () => {
			const error = new TransportError({
				status: 404,
				path: '/wpk/v1/things/123',
				method: 'GET',
			});

			expect(error).toBeInstanceOf(TransportError);
			expect(error).toBeInstanceOf(KernelError);
			expect(error.code).toBe('TransportError');
			expect(error.name).toBe('TransportError');
			expect(error.status).toBe(404);
			expect(error.path).toBe('/wpk/v1/things/123');
			expect(error.method).toBe('GET');
			expect(error.message).toBe('Not Found');
		});

		it('creates error with custom message', () => {
			const error = new TransportError({
				status: 500,
				path: '/wpk/v1/things',
				method: 'POST',
				message: 'Database connection failed',
			});

			expect(error.message).toBe('Database connection failed');
		});

		it('stores status, path, method in context', () => {
			const error = new TransportError({
				status: 403,
				path: '/wpk/v1/admin',
				method: 'GET',
			});

			expect(error.context).toEqual({
				status: 403,
				path: '/wpk/v1/admin',
				method: 'GET',
			});
		});

		it('merges additional context', () => {
			const error = new TransportError({
				status: 500,
				path: '/wpk/v1/things',
				method: 'POST',
				context: {
					requestId: 'abc-123',
					resourceName: 'thing',
				},
			});

			expect(error.context).toEqual({
				status: 500,
				path: '/wpk/v1/things',
				method: 'POST',
				requestId: 'abc-123',
				resourceName: 'thing',
			});
		});
	});

	describe('default messages for status codes', () => {
		const statusMessages = [
			[400, 'Bad Request'],
			[401, 'Unauthorized'],
			[403, 'Forbidden'],
			[404, 'Not Found'],
			[408, 'Request Timeout'],
			[429, 'Too Many Requests'],
			[500, 'Internal Server Error'],
			[502, 'Bad Gateway'],
			[503, 'Service Unavailable'],
			[504, 'Gateway Timeout'],
		] as const;

		statusMessages.forEach(([status, expectedMessage]) => {
			it(`returns "${expectedMessage}" for status ${status}`, () => {
				const error = new TransportError({
					status,
					path: '/test',
					method: 'GET',
				});

				expect(error.message).toBe(expectedMessage);
			});
		});

		it('returns generic message for unknown status code', () => {
			const error = new TransportError({
				status: 418, // I'm a teapot
				path: '/test',
				method: 'GET',
			});

			expect(error.message).toBe('HTTP 418 Error');
		});
	});

	describe('isTimeout', () => {
		it('returns true for 408 Request Timeout', () => {
			const error = new TransportError({
				status: 408,
				path: '/test',
				method: 'GET',
			});

			expect(error.isTimeout()).toBe(true);
		});

		it('returns true for 504 Gateway Timeout', () => {
			const error = new TransportError({
				status: 504,
				path: '/test',
				method: 'GET',
			});

			expect(error.isTimeout()).toBe(true);
		});

		it('returns false for non-timeout errors', () => {
			const error = new TransportError({
				status: 404,
				path: '/test',
				method: 'GET',
			});

			expect(error.isTimeout()).toBe(false);
		});
	});

	describe('isRetryable', () => {
		const retryableStatuses = [408, 429, 500, 502, 503, 504];

		retryableStatuses.forEach((status) => {
			it(`returns true for status ${status}`, () => {
				const error = new TransportError({
					status,
					path: '/test',
					method: 'GET',
				});

				expect(error.isRetryable()).toBe(true);
			});
		});

		it('returns false for client errors (4xx)', () => {
			const error = new TransportError({
				status: 404,
				path: '/test',
				method: 'GET',
			});

			expect(error.isRetryable()).toBe(false);
		});
	});

	describe('isClientError', () => {
		it('returns true for 4xx status codes', () => {
			[400, 401, 403, 404, 422].forEach((status) => {
				const error = new TransportError({
					status,
					path: '/test',
					method: 'GET',
				});

				expect(error.isClientError()).toBe(true);
			});
		});

		it('returns false for 5xx status codes', () => {
			const error = new TransportError({
				status: 500,
				path: '/test',
				method: 'GET',
			});

			expect(error.isClientError()).toBe(false);
		});
	});

	describe('isServerError', () => {
		it('returns true for 5xx status codes', () => {
			[500, 502, 503, 504].forEach((status) => {
				const error = new TransportError({
					status,
					path: '/test',
					method: 'GET',
				});

				expect(error.isServerError()).toBe(true);
			});
		});

		it('returns false for 4xx status codes', () => {
			const error = new TransportError({
				status: 404,
				path: '/test',
				method: 'GET',
			});

			expect(error.isServerError()).toBe(false);
		});
	});

	describe('serialization', () => {
		it('serializes to JSON with all fields', () => {
			const error = new TransportError({
				status: 500,
				path: '/wpk/v1/things',
				method: 'POST',
				message: 'Server error',
				data: {
					attempt: 3,
				},
			});

			const json = error.toJSON();

			expect(json.code).toBe('TransportError');
			expect(json.name).toBe('TransportError');
			expect(json.message).toBe('Server error');
			expect(json.context).toMatchObject({
				status: 500,
				path: '/wpk/v1/things',
				method: 'POST',
			});
		});
	});
});
