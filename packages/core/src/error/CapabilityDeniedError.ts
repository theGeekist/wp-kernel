/**
 * Capability Denied Error for WPKernel
 *
 * Thrown when a capability check fails via `capability.assert()` or action context.
 * Includes i18n-friendly messageKey for user-facing error messages.
 *
 * @module
 */

import { WPKernelError } from './WPKernelError';
import type { ErrorContext, ErrorData } from './types';

/**
 * Error thrown when a capability assertion fails
 *
 * @example
 * ```typescript
 * throw new CapabilityDeniedError({
 *   namespace: 'my-plugin',
 *   capabilityKey: 'posts.edit',
 *   params: { postId: 123 },
 *   message: 'You do not have permission to edit this post'
 * });
 * ```
 */
export class CapabilityDeniedError extends WPKernelError {
	/**
	 * I18n message key for user-facing error messages
	 * Format: `capability.denied.{namespace}.{capabilityKey}`
	 */
	public readonly messageKey: string;

	/**
	 * Capability key that was denied
	 */
	public readonly capabilityKey: string;

	/**
	 * Plugin namespace
	 */
	public readonly namespace: string;

	/**
	 * Create a new CapabilityDeniedError
	 *
	 * @param options               - Capability denied error options
	 * @param options.namespace     - Plugin namespace
	 * @param options.capabilityKey - Capability key that was denied
	 * @param options.params        - Parameters passed to capability check
	 * @param options.message       - Optional custom error message
	 * @param options.data          - Additional error data
	 * @param options.context       - Additional error context
	 */
	constructor(options: {
		namespace: string;
		capabilityKey: string;
		params?: unknown;
		message?: string;
		data?: ErrorData;
		context?: ErrorContext;
	}) {
		const message =
			options.message || `Capability "${options.capabilityKey}" denied.`;
		const messageKey = `capability.denied.${options.namespace}.${options.capabilityKey}`;

		// Build context with capabilityKey and params
		const context: ErrorContext = {
			...options.context,
			capabilityKey: options.capabilityKey,
		};

		// Merge params into context
		if (options.params && typeof options.params === 'object') {
			Object.assign(context, options.params as Record<string, unknown>);
		} else if (options.params !== undefined) {
			context.value = options.params;
		}

		super('CapabilityDenied', {
			message,
			data: options.data,
			context,
		});

		this.name = 'CapabilityDeniedError';
		this.messageKey = messageKey;
		this.capabilityKey = options.capabilityKey;
		this.namespace = options.namespace;

		// Set prototype explicitly for proper instanceof checks
		Object.setPrototypeOf(this, CapabilityDeniedError.prototype);
	}
}
