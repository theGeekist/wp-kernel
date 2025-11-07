/**
 * Base Error Class for WPKernel
 *
 * All errors in the framework extend from WPKernelError. This provides consistent
 * structure, serialization, and debugging capabilities.
 *
 * @module
 */

import type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './types';

/**
 * Base error class for WPKernel
 *
 * @example
 * ```typescript
 * throw new WPKernelError('CapabilityDenied', {
 *   message: 'User lacks required capability',
 *   context: { capabilityKey: 'things.manage', userId: 123 }
 * });
 * ```
 */
export class WPKernelError extends Error {
	/**
	 * Error code - identifies the type of error
	 */
	public readonly code: ErrorCode;

	/**
	 * Additional data about the error
	 */
	public readonly data?: ErrorData;

	/**
	 * Context in which the error occurred
	 */
	public readonly context?: ErrorContext;

	/**
	 * Create a new WPKernelError
	 *
	 * @param code            - Error code identifying the error type
	 * @param options         - Error options
	 * @param options.message
	 * @param options.data
	 * @param options.context
	 */
	constructor(
		code: ErrorCode,
		options: {
			message?: string;
			data?: ErrorData;
			context?: ErrorContext;
		} = {}
	) {
		const message =
			options.message || WPKernelError.getDefaultMessage(code);

		super(message);

		// Maintains proper stack trace for where error was thrown (V8 only)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}

		this.name = 'WPKernelError';
		this.code = code;
		this.data = options.data;
		this.context = options.context;

		// Set prototype explicitly (required for custom errors in TypeScript)
		Object.setPrototypeOf(this, WPKernelError.prototype);
	}

	/**
	 * Serialize error to JSON-safe format
	 *
	 * @return Serialized error object
	 */
	public toJSON(): SerializedError {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			data: this.data,
			context: this.context,
			stack: this.stack,
		};
	}

	/**
	 * Create WPKernelError from serialized format
	 *
	 * @param serialized - Serialized error object
	 * @return New WPKernelError instance
	 */
	public static fromJSON(serialized: SerializedError): WPKernelError {
		const error = new WPKernelError(serialized.code, {
			message: serialized.message,
			data: serialized.data,
			context: serialized.context,
		});

		// Restore stack if available
		if (serialized.stack) {
			error.stack = serialized.stack;
		}

		return error;
	}

	/**
	 * Get default message for error code
	 *
	 * @param code - Error code
	 * @return Default error message
	 */
	private static getDefaultMessage(code: ErrorCode): string {
		const messages: Record<ErrorCode, string> = {
			TransportError: 'Network request failed',
			ServerError: 'Server returned an error',
			CapabilityDenied: 'Permission denied',
			ValidationError: 'Validation failed',
			TimeoutError: 'Request timed out',
			NotImplementedError: 'Feature not yet implemented',
			DeveloperError: 'Invalid API usage',
			DeprecatedError: 'API is deprecated',
			UnknownError: 'An unknown error occurred',
		};

		return messages[code] || 'An error occurred';
	}

	/**
	 * Check if an error is a WPKernelError
	 *
	 * @param error - Error to check
	 * @return True if error is a WPKernelError
	 */
	public static isWPKernelError(error: unknown): error is WPKernelError {
		return error instanceof WPKernelError;
	}

	/**
	 * Wrap a native Error into a WPKernelError
	 *
	 * @param error   - Native error to wrap
	 * @param code    - Error code to assign
	 * @param context - Additional context
	 * @return New WPKernelError wrapping the original
	 */
	public static wrap(
		error: Error,
		code: ErrorCode = 'UnknownError',
		context?: ErrorContext
	): WPKernelError {
		return new WPKernelError(code, {
			message: error.message,
			data: {
				originalError: error,
			},
			context,
		});
	}
}
