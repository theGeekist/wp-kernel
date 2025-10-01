/**
 * Tests for ServerError
 */

import { ServerError } from '../ServerError.js';
import { KernelError } from '../KernelError.js';

describe('ServerError', () => {
	describe('constructor', () => {
		it('creates server error with required fields', () => {
			const error = new ServerError({
				serverCode: 'rest_forbidden',
				serverMessage: 'Sorry, you are not allowed to do that.',
				status: 403,
				path: '/wpk/v1/things',
				method: 'POST',
			});

			expect(error).toBeInstanceOf(ServerError);
			expect(error).toBeInstanceOf(KernelError);
			expect(error.code).toBe('ServerError');
			expect(error.name).toBe('ServerError');
			expect(error.serverCode).toBe('rest_forbidden');
			expect(error.serverMessage).toBe(
				'Sorry, you are not allowed to do that.'
			);
			expect(error.message).toBe(
				'Sorry, you are not allowed to do that.'
			);
			expect(error.status).toBe(403);
			expect(error.path).toBe('/wpk/v1/things');
			expect(error.method).toBe('POST');
		});

		it('stores server error details in data', () => {
			const error = new ServerError({
				serverCode: 'rest_invalid_param',
				serverMessage: 'Invalid parameter(s): title',
				status: 400,
				path: '/wpk/v1/things',
				method: 'POST',
				serverData: {
					params: {
						title: 'Title is required',
					},
				},
			});

			expect(error.data).toEqual({
				serverCode: 'rest_invalid_param',
				serverMessage: 'Invalid parameter(s): title',
				serverData: {
					params: {
						title: 'Title is required',
					},
				},
			});
		});

		it('merges additional context', () => {
			const error = new ServerError({
				serverCode: 'rest_error',
				serverMessage: 'Error occurred',
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

	describe('fromWordPressResponse', () => {
		it('parses WordPress REST error response', () => {
			const response = {
				code: 'rest_forbidden',
				message: 'Sorry, you are not allowed to do that.',
				data: {
					status: 403,
				},
			};

			const error = ServerError.fromWordPressResponse(
				response,
				'/wpk/v1/things',
				'POST'
			);

			expect(error.serverCode).toBe('rest_forbidden');
			expect(error.serverMessage).toBe(
				'Sorry, you are not allowed to do that.'
			);
			expect(error.status).toBe(403);
			expect(error.path).toBe('/wpk/v1/things');
			expect(error.method).toBe('POST');
		});

		it('defaults to status 500 if not provided', () => {
			const response = {
				code: 'rest_error',
				message: 'An error occurred',
			};

			const error = ServerError.fromWordPressResponse(
				response,
				'/test',
				'GET'
			);

			expect(error.status).toBe(500);
		});

		it('includes server data in response', () => {
			const response = {
				code: 'rest_invalid_param',
				message: 'Invalid parameters',
				data: {
					status: 400,
					params: {
						email: 'Invalid email format',
						title: 'Title is required',
					},
				},
			};

			const error = ServerError.fromWordPressResponse(
				response,
				'/test',
				'POST'
			);

			expect(error.serverData).toEqual({
				status: 400,
				params: {
					email: 'Invalid email format',
					title: 'Title is required',
				},
			});
		});

		it('accepts additional context', () => {
			const response = {
				code: 'rest_error',
				message: 'Error',
			};

			const error = ServerError.fromWordPressResponse(
				response,
				'/test',
				'GET',
				{
					requestId: 'xyz-789',
					resourceName: 'thing',
				}
			);

			expect(error.context).toMatchObject({
				requestId: 'xyz-789',
				resourceName: 'thing',
			});
		});
	});

	describe('isPermissionError', () => {
		const permissionCodes = [
			'rest_forbidden',
			'rest_cannot_create',
			'rest_cannot_edit',
			'rest_cannot_delete',
			'rest_cannot_read',
		];

		permissionCodes.forEach((code) => {
			it(`returns true for code: ${code}`, () => {
				const error = new ServerError({
					serverCode: code,
					serverMessage: 'Permission denied',
					status: 403,
					path: '/test',
					method: 'POST',
				});

				expect(error.isPermissionError()).toBe(true);
			});
		});

		it('returns true for 403 status even with different code', () => {
			const error = new ServerError({
				serverCode: 'custom_forbidden',
				serverMessage: 'Access denied',
				status: 403,
				path: '/test',
				method: 'GET',
			});

			expect(error.isPermissionError()).toBe(true);
		});

		it('returns false for non-permission errors', () => {
			const error = new ServerError({
				serverCode: 'rest_invalid_param',
				serverMessage: 'Invalid parameter',
				status: 400,
				path: '/test',
				method: 'POST',
			});

			expect(error.isPermissionError()).toBe(false);
		});
	});

	describe('isValidationError', () => {
		it('returns true for rest_invalid_param', () => {
			const error = new ServerError({
				serverCode: 'rest_invalid_param',
				serverMessage: 'Invalid parameters',
				status: 400,
				path: '/test',
				method: 'POST',
			});

			expect(error.isValidationError()).toBe(true);
		});

		it('returns true for rest_missing_callback_param', () => {
			const error = new ServerError({
				serverCode: 'rest_missing_callback_param',
				serverMessage: 'Missing parameter',
				status: 400,
				path: '/test',
				method: 'POST',
			});

			expect(error.isValidationError()).toBe(true);
		});

		it('returns true for 400 status', () => {
			const error = new ServerError({
				serverCode: 'custom_validation_error',
				serverMessage: 'Validation failed',
				status: 400,
				path: '/test',
				method: 'POST',
			});

			expect(error.isValidationError()).toBe(true);
		});

		it('returns false for non-validation errors', () => {
			const error = new ServerError({
				serverCode: 'rest_forbidden',
				serverMessage: 'Forbidden',
				status: 403,
				path: '/test',
				method: 'POST',
			});

			expect(error.isValidationError()).toBe(false);
		});
	});

	describe('isNotFoundError', () => {
		const notFoundCodes = ['rest_post_invalid_id', 'rest_not_found'];

		notFoundCodes.forEach((code) => {
			it(`returns true for code: ${code}`, () => {
				const error = new ServerError({
					serverCode: code,
					serverMessage: 'Not found',
					status: 404,
					path: '/test',
					method: 'GET',
				});

				expect(error.isNotFoundError()).toBe(true);
			});
		});

		it('returns true for 404 status', () => {
			const error = new ServerError({
				serverCode: 'custom_not_found',
				serverMessage: 'Resource not found',
				status: 404,
				path: '/test',
				method: 'GET',
			});

			expect(error.isNotFoundError()).toBe(true);
		});

		it('returns false for non-404 errors', () => {
			const error = new ServerError({
				serverCode: 'rest_error',
				serverMessage: 'Error',
				status: 500,
				path: '/test',
				method: 'GET',
			});

			expect(error.isNotFoundError()).toBe(false);
		});
	});

	describe('getValidationErrors', () => {
		it('extracts validation errors from params', () => {
			const error = new ServerError({
				serverCode: 'rest_invalid_param',
				serverMessage: 'Invalid parameters',
				status: 400,
				path: '/test',
				method: 'POST',
				serverData: {
					params: {
						email: 'Invalid email format',
						title: 'Title is required',
						status: 'Status must be one of: draft, published',
					},
				},
			});

			const validationErrors = error.getValidationErrors();

			expect(validationErrors).toEqual([
				{
					field: 'email',
					message: 'Invalid email format',
					code: 'rest_invalid_param',
				},
				{
					field: 'title',
					message: 'Title is required',
					code: 'rest_invalid_param',
				},
				{
					field: 'status',
					message: 'Status must be one of: draft, published',
					code: 'rest_invalid_param',
				},
			]);
		});

		it('returns empty array if no params', () => {
			const error = new ServerError({
				serverCode: 'rest_error',
				serverMessage: 'Error',
				status: 500,
				path: '/test',
				method: 'POST',
			});

			expect(error.getValidationErrors()).toEqual([]);
		});

		it('returns empty array if serverData is undefined', () => {
			const error = new ServerError({
				serverCode: 'rest_error',
				serverMessage: 'Error',
				status: 500,
				path: '/test',
				method: 'POST',
				serverData: undefined,
			});

			expect(error.getValidationErrors()).toEqual([]);
		});
	});
});
