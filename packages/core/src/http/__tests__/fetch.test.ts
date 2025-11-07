/**
 * Tests for the transport fetch wrapper
 */
import { fetch } from '../fetch';
import { WPKernelError } from '../../error/index';
import type { Reporter } from '../../reporter';
import { setWPKernelReporter, clearWPKReporter } from '../../reporter';
import {
	createApiFetchHarness,
	withWordPressData,
} from '@wpkernel/test-utils/core';

describe('transport/fetch', () => {
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;
	let apiHarness: ReturnType<typeof createApiFetchHarness>;
	let nowSpy: jest.SpyInstance<number, []>;

	beforeEach(() => {
		// Mock @wordpress/api-fetch
		apiHarness = createApiFetchHarness();
		mockApiFetch = apiHarness.apiFetch;
		mockDoAction = apiHarness.doAction;

		// Mock performance.now
		nowSpy = jest.spyOn(performance, 'now').mockReturnValue(1000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		apiHarness.harness.teardown();
		clearWPKReporter();
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
		it('should normalize WordPress REST API errors to WPKernelError', async () => {
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
			).rejects.toThrow(WPKernelError);

			try {
				await fetch({
					path: '/my-plugin/v1/things/1',
					method: 'DELETE',
				});
			} catch (error) {
				expect(error).toBeInstanceOf(WPKernelError);
				expect((error as WPKernelError).code).toBe('ServerError');
				expect((error as WPKernelError).message).toBe(
					'Sorry, you are not allowed to do that.'
				);
				expect((error as WPKernelError).data).toEqual({
					code: 'rest_forbidden',
					status: 403,
				});
			}
		});

		it('should normalize network errors to WPKernelError', async () => {
			const networkError = new Error('Network request failed');
			networkError.name = 'NetworkError';
			mockApiFetch.mockRejectedValue(networkError);

			try {
				await fetch({
					path: '/my-plugin/v1/things',
					method: 'GET',
				});
			} catch (error) {
				expect(error).toBeInstanceOf(WPKernelError);
				expect((error as WPKernelError).code).toBe('TransportError');
				expect((error as WPKernelError).message).toBe(
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
			await withWordPressData({ apiFetch: null }, async () => {
				await expect(
					fetch({
						path: '/my-plugin/v1/things',
						method: 'GET',
					})
				).rejects.toThrow(WPKernelError);

				try {
					await fetch({
						path: '/my-plugin/v1/things',
						method: 'GET',
					});
				} catch (error) {
					expect((error as WPKernelError).code).toBe(
						'DeveloperError'
					);
					expect((error as WPKernelError).message).toContain(
						'@wordpress/api-fetch is not available'
					);
				}
			});
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
				expect(error).toBeInstanceOf(WPKernelError);
				expect((error as WPKernelError).code).toBe('TransportError');
				expect((error as WPKernelError).message).toBe(
					'Unknown transport error'
				);
				expect((error as WPKernelError).context?.error).toBe(
					'Something went wrong'
				);
			}
		});

		it('should preserve existing WPKernelError instances', async () => {
			const customError = new WPKernelError('CapabilityDenied', {
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
				expect((error as WPKernelError).code).toBe('CapabilityDenied');
			}
		});
	});

	describe('environment handling', () => {
		it('should handle missing window (Node.js environment)', async () => {
			await withWordPressData({ wp: null }, async () => {
				await expect(
					fetch({
						path: '/my-plugin/v1/things',
						method: 'GET',
					})
				).rejects.toThrow('not available');
			});
		});

		it('should handle missing hooks (no event emission)', async () => {
			await withWordPressData({ hooks: null }, async () => {
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

	describe('reporter metadata', () => {
		it('emits request and response logs when reporter provided', async () => {
			const { reporter, logs } = createReporterSpy();
			mockApiFetch.mockResolvedValue({ id: 1 });
			nowSpy.mockReturnValueOnce(1000).mockReturnValue(1010);

			await fetch({
				path: '/my-plugin/v1/things',
				method: 'GET',
				meta: {
					reporter,
					namespace: 'acme',
					resourceName: 'thing',
				},
			});

			expect(logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'debug',
						message: 'transport.request',
						context: expect.objectContaining({
							namespace: 'acme',
							resourceName: 'thing',
							path: '/my-plugin/v1/things',
							method: 'GET',
							requestId: expect.any(String),
						}),
					}),
					expect.objectContaining({
						level: 'info',
						message: 'transport.response',
						context: expect.objectContaining({
							duration: 10,
							namespace: 'acme',
							resourceName: 'thing',
						}),
					}),
				])
			);
		});

		it('logs transport errors with reporter metadata', async () => {
			const { reporter, logs } = createReporterSpy();
			const wpError = {
				code: 'rest_error',
				message: 'Boom',
				data: { status: 500 },
			};
			mockApiFetch.mockRejectedValue(wpError);

			await expect(
				fetch({
					path: '/my-plugin/v1/things/1',
					method: 'DELETE',
					meta: {
						reporter,
						namespace: 'acme',
						resourceName: 'thing',
					},
				})
			).rejects.toThrow(WPKernelError);

			expect(logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'debug',
						message: 'transport.request',
					}),
					expect.objectContaining({
						level: 'error',
						message: 'transport.error',
						context: expect.objectContaining({
							namespace: 'acme',
							resourceName: 'thing',
							error: 'Boom',
						}),
					}),
				])
			);
		});

		it('uses WPKernel reporter when metadata is not provided', async () => {
			const wpKernelSpy = createReporterSpy();
			setWPKernelReporter(wpKernelSpy.reporter);
			mockApiFetch.mockResolvedValue({ id: 7 });

			await fetch({
				path: '/my-plugin/v1/things/7',
				method: 'GET',
			});

			expect(wpKernelSpy.logs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						level: 'debug',
						message: 'transport.request',
						context: expect.objectContaining({
							resourceName: undefined,
						}),
					}),
					expect.objectContaining({
						level: 'info',
						message: 'transport.response',
					}),
				])
			);
		});
	});
});
