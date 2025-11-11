/**
 * Error Module for WPKernel
 *
 * Exports all error types and utilities for consistent error handling throughout the framework.
 *
 * @module
 */

/**
 * Base error class for all WPKernel specific errors.
 *
 * This class extends the native `Error` object and adds a `code` property
 * for programmatic error identification and a `context` property for
 * additional debugging information.
 *
 * @category Errors
 */
export { WPKernelError } from './WPKernelError';
export { EnvironmentalError } from './EnvironmentalError';
/**
 * Error class for issues related to HTTP transport operations.
 *
 * This error is typically thrown when there are problems with making HTTP requests
 * or receiving responses, such as network errors or invalid server responses.
 *
 * @category Errors
 */
export { TransportError } from './TransportError';
/**
 * Error class for server-side issues, typically from REST API responses.
 *
 * This error encapsulates details from a WordPress REST API error response,
 * including status code, error code, and message.
 *
 * @category Errors
 */
export { ServerError } from './ServerError';
/**
 * Error class indicating that a user does not have the necessary capabilities
 * to perform a requested action.
 *
 * @category Errors
 */
export { CapabilityDeniedError } from './CapabilityDeniedError';
export type { WordPressRESTError } from './ServerError';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './types';
