/**
 * Transport Error for WP Kernel
 *
 * Represents HTTP/network errors that occur during REST API communication.
 *
 * @module
 */

import { KernelError } from './KernelError';
import type { ErrorContext, ErrorData } from './types';

/**
 * Error thrown when a network/HTTP request fails
 *
 * @example
 * ```typescript
 * throw new TransportError({
 *   status: 404,
 *   path: '/my-plugin/v1/things/123',
 *   method: 'GET',
 *   message: 'Resource not found'
 * });
 * ```
 */
export class TransportError extends KernelError {
	/**
	 * HTTP status code
	 */
	public readonly status: number;

	/**
	 * Request path
	 */
	public readonly path: string;

	/**
	 * HTTP method
	 */
	public readonly method: string;

	/**
	 * Create a new TransportError
	 *
	 * @param options         - Transport error options
	 * @param options.status
	 * @param options.path
	 * @param options.method
	 * @param options.message
	 * @param options.data
	 * @param options.context
	 */
	constructor(options: {
		status: number;
		path: string;
		method: string;
		message?: string;
		data?: ErrorData;
		context?: ErrorContext;
	}) {
		const message =
			options.message ||
			TransportError.getMessageForStatus(options.status);

		super('TransportError', {
			message,
			data: options.data,
			context: {
				...options.context,
				status: options.status,
				path: options.path,
				method: options.method,
			},
		});

		this.name = 'TransportError';
		this.status = options.status;
		this.path = options.path;
		this.method = options.method;

		// Set prototype explicitly
		Object.setPrototypeOf(this, TransportError.prototype);
	}

	/**
	 * Get default message for HTTP status code
	 *
	 * @param status - HTTP status code
	 * @return Default error message
	 */
	private static getMessageForStatus(status: number): string {
		const messages: Record<number, string> = {
			400: 'Bad Request',
			401: 'Unauthorized',
			403: 'Forbidden',
			404: 'Not Found',
			408: 'Request Timeout',
			429: 'Too Many Requests',
			500: 'Internal Server Error',
			502: 'Bad Gateway',
			503: 'Service Unavailable',
			504: 'Gateway Timeout',
		};

		return messages[status] || `HTTP ${status} Error`;
	}

	/**
	 * Check if error is a network timeout
	 *
	 * @return True if this is a timeout error
	 */
	public isTimeout(): boolean {
		return this.status === 408 || this.status === 504;
	}

	/**
	 * Check if error is retryable
	 *
	 * @return True if request should be retried
	 */
	public isRetryable(): boolean {
		// Retry on network timeouts and server errors
		return (
			this.status === 408 ||
			this.status === 429 ||
			this.status === 500 ||
			this.status === 502 ||
			this.status === 503 ||
			this.status === 504
		);
	}

	/**
	 * Check if error is a client error (4xx)
	 *
	 * @return True if this is a client error
	 */
	public isClientError(): boolean {
		return this.status >= 400 && this.status < 500;
	}

	/**
	 * Check if error is a server error (5xx)
	 *
	 * @return True if this is a server error
	 */
	public isServerError(): boolean {
		return this.status >= 500 && this.status < 600;
	}
}
