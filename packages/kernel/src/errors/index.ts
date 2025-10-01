/**
 * Error Module for WP Kernel
 *
 * Exports all error types and utilities for consistent error handling throughout the framework.
 *
 * @module
 */

export { KernelError } from './KernelError.js';
export { TransportError } from './TransportError.js';
export { ServerError } from './ServerError.js';
export type { WordPressRESTError } from './ServerError.js';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './types.js';
