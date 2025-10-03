/**
 * Tests for the transport fetch wrapper
 */
import { fetch } from '../fetch';
import { KernelError } from '../../error/index';

describe('transport/fetch', () => {
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: unknown;

	beforeEach(() => {
		// Mock @wordpress/api-fetch
		mockApiFetch = jest.fn();
		mockDoAction = jest.fn();

		// Save original wp object
		originalWp = global.window?.wp;

		// Setup global wp object (don't replace window, just wp)
		if (typeof global.window !== 'undefined') {
			global.window.wp = {
				...global.window.wp,
				apiFetch: mockApiFetch,
				hooks: {
					doAction: mockDoAction,
				},
			} as typeof global.window.wp & {
				apiFetch: jest.Mock;
				hooks: { doAction: jest.Mock };
			};
		}

		// Mock performance.now
		jest.spyOn(performance, 'now').mockReturnValue(1000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		// Restore original wp object
		if (typeof (global as { window?: unknown }).window !== 'undefined') {
			if (originalWp) {
				(global as { window: { wp: unknown } }).window.wp = originalWp;
			} else {
				delete (global as { window: { wp?: unknown } }).window.wp;
			}
		}
	});

	describe('successful requests', () => {
		it('should fetch data and return response with requestId', async () => {
			const mockData = { id: 1, title: 'Test' };
			mockApiFetch.mockResolvedValue(mockData);

			const response = await fetch({
				path: '/my-plugin/v1/things/1',
				method: 'GET',
			});

			expect(response.data).toEqual(mockData);
			expect(response.status).toBe(200);
			expect(response.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things/1',
				method: 'GET',
				data: undefined,
				parse: true,
			});
		});

		it('should use provided requestId if given', async () => {
			mockApiFetch.mockResolvedValue({ id: 1 });

			const response = await fetch({
				path: '/my-plugin/v1/things/1',
				method: 'GET',
				requestId: 'custom_request_id',
			});

			expect(response.requestId).toBe('custom_request_id');
		});

		it('should emit wpk.resource.request event before request', async () => {
			mockApiFetch.mockResolvedValue({ id: 1 });

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				query: { q: 'search' },
			});

			expect(mockDoAction).toHaveBeenCalledWith(
				'wpk.resource.request',
				expect.objectContaining({
					method: 'GET',
					path: '/my-plugin/v1/things',
					query: { q: 'search' },
					requestId: expect.any(String),
					timestamp: expect.any(Number),
				})
			);
		});

		it('should emit wpk.resource.response event after successful request', async () => {
			const mockData = { id: 1, title: 'Test' };
			mockApiFetch.mockResolvedValue(mockData);

			await fetch({
				path: '/my-plugin/v1/things/1',
				method: 'GET',
			});

			expect(mockDoAction).toHaveBeenCalledWith(
				'wpk.resource.response',
				expect.objectContaining({
					method: 'GET',
					path: '/my-plugin/v1/things/1',
					status: 200,
					data: mockData,
					duration: expect.any(Number),
					requestId: expect.any(String),
					timestamp: expect.any(Number),
				})
			);
		});
	});

	describe('query parameters', () => {
		it('should append query parameters to path', async () => {
			mockApiFetch.mockResolvedValue([]);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				query: { q: 'search', page: 2, status: 'active' },
			});

			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things?q=search&page=2&status=active',
				method: 'GET',
				data: undefined,
				parse: true,
			});
		});

		it('should skip undefined and null query parameters', async () => {
			mockApiFetch.mockResolvedValue([]);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				query: { q: 'search', empty: null, missing: undefined },
			});

			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things?q=search',
				method: 'GET',
				data: undefined,
				parse: true,
			});
		});
	});

	describe('_fields parameter support', () => {
		it('should append _fields parameter when fields array provided', async () => {
			mockApiFetch.mockResolvedValue([]);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				fields: ['id', 'title', 'status'],
			});

			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things?_fields=id%2Ctitle%2Cstatus',
				method: 'GET',
				data: undefined,
				parse: true,
			});
		});

		it('should combine query params and _fields parameter', async () => {
			mockApiFetch.mockResolvedValue([]);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				query: { status: 'active' },
				fields: ['id', 'title'],
			});

			const call = mockApiFetch.mock.calls[0][0];
			expect(call.path).toContain('status=active');
			expect(call.path).toContain('_fields=id%2Ctitle');
		});

		it('should not add _fields if fields array is empty', async () => {
			mockApiFetch.mockResolvedValue([]);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				fields: [],
			});

			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things',
				method: 'GET',
				data: undefined,
				parse: true,
			});
		});
	});

	describe('POST/PUT requests with data', () => {
		it('should send data in POST request', async () => {
			mockApiFetch.mockResolvedValue({ id: 1 });

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'POST',
				data: { title: 'New Thing', description: 'Test' },
			});

			expect(mockApiFetch).toHaveBeenCalledWith({
				path: '/my-plugin/v1/things',
				method: 'POST',
				data: { title: 'New Thing', description: 'Test' },
				parse: true,
			});
		});
	});

	describe('error handling', () => {
		it('should normalize WordPress REST API errors to KernelError', async () => {
			const wpError = {
				code: 'rest_forbidden',
				message: 'Sorry, you are not allowed to do that.',
				data: { status: 403 },
			};
			mockApiFetch.mockRejectedValue(wpError);

			await expect(
				fetch({
					path: '/my-plugin/v1/things/1',
					method: 'DELETE',
				})
			).rejects.toThrow(KernelError);

			try {
				await fetch({
					path: '/my-plugin/v1/things/1',
					method: 'DELETE',
				});
			} catch (error) {
				expect(error).toBeInstanceOf(KernelError);
				expect((error as KernelError).code).toBe('ServerError');
				expect((error as KernelError).message).toBe(
					'Sorry, you are not allowed to do that.'
				);
				expect((error as KernelError).data).toEqual({
					code: 'rest_forbidden',
					status: 403,
				});
			}
		});

		it('should normalize network errors to KernelError', async () => {
			const networkError = new Error('Network request failed');
			networkError.name = 'NetworkError';
			mockApiFetch.mockRejectedValue(networkError);

			try {
				await fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				});
			} catch (error) {
				expect(error).toBeInstanceOf(KernelError);
				expect((error as KernelError).code).toBe('TransportError');
				expect((error as KernelError).message).toBe(
					'Network request failed'
				);
			}
		});

		it('should emit wpk.resource.error event on failure', async () => {
			const wpError = {
				code: 'rest_not_found',
				message: 'Resource not found',
				data: { status: 404 },
			};
			mockApiFetch.mockRejectedValue(wpError);

			try {
				await fetch({
					path: '/my-plugin/v1/things/999',
					method: 'GET',
				});
			} catch {
				// Expected to throw
			}

			expect(mockDoAction).toHaveBeenCalledWith(
				'wpk.resource.error',
				expect.objectContaining({
					method: 'GET',
					path: '/my-plugin/v1/things/999',
					code: 'ServerError',
					message: 'Resource not found',
					status: 404,
					duration: expect.any(Number),
					requestId: expect.any(String),
					timestamp: expect.any(Number),
				})
			);
		});

		it('should throw DeveloperError if @wordpress/api-fetch not available', async () => {
			// Remove apiFetch from global
			(
				global as { window: { wp: { apiFetch?: unknown } } }
			).window.wp.apiFetch = undefined;

			await expect(
				fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				})
			).rejects.toThrow(KernelError);

			try {
				await fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				});
			} catch (error) {
				expect((error as KernelError).code).toBe('DeveloperError');
				expect((error as KernelError).message).toContain(
					'@wordpress/api-fetch is not available'
				);
			}
		});

		it('should handle unknown error types with string conversion', async () => {
			// Mock a non-Error object (e.g., string or number thrown)
			mockApiFetch.mockRejectedValue('Something went wrong');

			try {
				await fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				});
			} catch (error) {
				expect(error).toBeInstanceOf(KernelError);
				expect((error as KernelError).code).toBe('TransportError');
				expect((error as KernelError).message).toBe(
					'Unknown transport error'
				);
				expect((error as KernelError).context?.error).toBe(
					'Something went wrong'
				);
			}
		});

		it('should preserve existing KernelError instances', async () => {
			const customError = new KernelError('PolicyDenied', {
				message: 'Custom error',
			});
			mockApiFetch.mockRejectedValue(customError);

			try {
				await fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				});
			} catch (error) {
				expect(error).toBe(customError);
				expect((error as KernelError).code).toBe('PolicyDenied');
			}
		});
	});

	describe('environment handling', () => {
		it('should handle missing window (Node.js environment)', async () => {
			// Temporarily remove wp object to simulate Node environment
			const savedWp = (global as { window?: { wp?: unknown } }).window
				?.wp;
			if (
				typeof (global as { window?: unknown }).window !== 'undefined'
			) {
				delete (global as { window: { wp?: unknown } }).window.wp;
			}

			// Should throw DeveloperError since apiFetch won't be available
			await expect(
				fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				})
			).rejects.toThrow('not available');

			// Restore
			if (
				typeof (global as { window?: unknown }).window !==
					'undefined' &&
				savedWp
			) {
				(global as { window: { wp: unknown } }).window.wp = savedWp;
			}
		});

		it('should handle missing hooks (no event emission)', async () => {
			// Setup apiFetch without hooks
			if (
				typeof (global as { window?: unknown }).window !== 'undefined'
			) {
				(global as { window: { wp: unknown } }).window.wp = {
					apiFetch: mockApiFetch,
					// No hooks object
				};
			}
			mockApiFetch.mockResolvedValue({ id: 1 });

			// Should complete successfully without emitting events
			const response = await fetch({
				path: '/my-plugin/v1/things/1',
				method: 'GET',
			});

			expect(response.data).toEqual({ id: 1 });
			expect(mockDoAction).not.toHaveBeenCalled();
		});
	});
});
