/**
 * Transport layer implementation
 *
 * Wraps @wordpress/api-fetch with:
 * - Request ID generation for correlation
 * - Event emission (wpk.resource.request/response/error)
 * - Error normalization to KernelError
 * - _fields query parameter support
 *
 * @see Product Specification § 4.1 Resources
 */

import { KernelError } from '../error/KernelError.js';
import type {
	TransportRequest,
	TransportResponse,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
} from './types.js';

/**
 * Generate a unique request ID for correlation
 */
function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get WordPress hooks for event emission
 * Returns null if not in browser environment
 */
function getHooks() {
	if (typeof window === 'undefined') {
		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const globalWp = (window as any).wp;
	return globalWp?.hooks || null;
}

/**
 * Build full URL with query parameters
 * @param path
 * @param query
 * @param fields
 */
function buildUrl(
	path: string,
	query?: Record<string, unknown>,
	fields?: string[]
): string {
	const url = new URL(path, 'http://dummy.local'); // Base URL doesn't matter for relative paths

	// Add query parameters
	if (query) {
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value));
			}
		});
	}

	// Add _fields parameter if specified
	if (fields && fields.length > 0) {
		url.searchParams.append('_fields', fields.join(','));
	}

	// Return path + search params (without the dummy base)
	return url.pathname + url.search;
}

/**
 * Normalize WordPress REST API error to KernelError
 * @param error
 * @param requestId
 * @param method
 * @param path
 */
function normalizeError(
	error: unknown,
	requestId: string,
	method: string,
	path: string
): KernelError {
	// Already a KernelError
	if (error instanceof KernelError) {
		return error;
	}

	// WordPress REST API error format
	if (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		'message' in error
	) {
		const wpError = error as {
			code: string;
			message: string;
			data?: { status?: number };
		};

		return new KernelError('ServerError', {
			message: wpError.message,
			data: {
				code: wpError.code,
				status: wpError.data?.status,
			},
			context: {
				requestId,
				method,
				path,
			},
		});
	}

	// Network/transport error
	if (error instanceof Error) {
		return new KernelError('TransportError', {
			message: error.message,
			context: {
				requestId,
				method,
				path,
				originalError: error.name,
			},
		});
	}

	// Unknown error
	return new KernelError('TransportError', {
		message: 'Unknown transport error',
		context: {
			requestId,
			method,
			path,
			error: String(error),
		},
	});
}

/**
 * Fetch data from WordPress REST API
 *
 * Wraps @wordpress/api-fetch with:
 * - Automatic request ID generation
 * - Event emission for observability
 * - Error normalization
 * - _fields parameter support
 *
 * @template T - Expected response data type
 * @param    request - Request configuration
 * @return Promise resolving to response with data and metadata
 * @throws KernelError on request failure
 *
 * @example
 * ```typescript
 * import { fetch } from '@geekist/wp-kernel/transport';
 *
 * const response = await fetch<Thing>({
 *   path: '/wpk/v1/things/123',
 *   method: 'GET'
 * });
 *
 * console.log(response.data); // Thing object
 * console.log(response.requestId); // 'req_1234567890_abc123'
 * ```
 */
export async function fetch<T = unknown>(
	request: TransportRequest
): Promise<TransportResponse<T>> {
	const requestId = request.requestId || generateRequestId();
	const startTime = performance.now();
	const hooks = getHooks();

	// Build URL with query params and _fields
	const fullPath = buildUrl(request.path, request.query, request.fields);

	// Emit request event
	if (hooks?.doAction) {
		const requestEvent: ResourceRequestEvent = {
			requestId,
			method: request.method,
			path: request.path,
			query: request.query,
			timestamp: Date.now(),
		};
		hooks.doAction('wpk.resource.request', requestEvent);
	}

	try {
		// Import @wordpress/api-fetch dynamically (peer dependency)
		type ApiFetchOptions = {
			path?: string;
			url?: string;
			method?: string;
			data?: unknown;
			parse?: boolean;
		};

		const globalWp =
			typeof window !== 'undefined'
				? (
						window as Window & {
							wp?: {
								apiFetch?: (
									options: ApiFetchOptions
								) => Promise<unknown>;
							};
						}
					).wp
				: null;

		const apiFetch = globalWp?.apiFetch;

		if (!apiFetch) {
			throw new KernelError('DeveloperError', {
				message:
					'@wordpress/api-fetch is not available. Ensure it is loaded as a dependency.',
				context: { requestId, method: request.method, path: fullPath },
			});
		}

		// Make the request
		const data = await apiFetch({
			path: fullPath,
			method: request.method,
			data: request.data,
			parse: true, // Automatically parse JSON response
		});

		const duration = performance.now() - startTime;

		// Build response
		const response: TransportResponse<T> = {
			data: data as T,
			status: 200, // @wordpress/api-fetch doesn't expose status, assume 200 on success
			headers: {}, // @wordpress/api-fetch doesn't expose headers
			requestId,
		};

		// Emit response event
		if (hooks?.doAction) {
			const responseEvent: ResourceResponseEvent<T> = {
				requestId,
				method: request.method,
				path: request.path,
				status: response.status,
				data: response.data,
				duration,
				timestamp: Date.now(),
			};
			hooks.doAction('wpk.resource.response', responseEvent);
		}

		return response;
	} catch (error) {
		const duration = performance.now() - startTime;
		const kernelError = normalizeError(
			error,
			requestId,
			request.method,
			fullPath
		);

		// Emit error event
		if (hooks?.doAction) {
			const errorEvent: ResourceErrorEvent = {
				requestId,
				method: request.method,
				path: request.path,
				code: kernelError.code,
				message: kernelError.message,
				status:
					kernelError.data && typeof kernelError.data === 'object'
						? (kernelError.data as { status?: number }).status
						: undefined,
				duration,
				timestamp: Date.now(),
			};
			hooks.doAction('wpk.resource.error', errorEvent);
		}

		throw kernelError;
	}
}
