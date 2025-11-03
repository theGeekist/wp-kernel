/**
 * Transport layer implementation
 *
 * Wraps @wordpress/api-fetch with:
 * - Request ID generation for correlation
 * - Event emission (wpk.resource.request/response/error)
 * - Error normalization to WPKernelError
 * - _fields query parameter support
 *
 * @see Product Specification § 4.1 Resources
 * @category HTTP
 */

import { WPKernelError } from '../error/WPKernelError';
import { WPK_EVENTS } from '../contracts/index.js';
import { createNoopReporter, getWPKernelReporter } from '../reporter';
import { resolveReporter as resolveKernelReporter } from '../reporter/resolve';
import type { Reporter } from '../reporter';
import type {
	TransportRequest,
	TransportResponse,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
	TransportMeta,
} from './types';

/**
 * Generate a unique request ID for transport correlation.
 *
 * @category HTTP
 */
function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const TRANSPORT_LOG_MESSAGES = {
	request: 'transport.request',
	response: 'transport.response',
	error: 'transport.error',
} as const;

function resolveTransportReporter(meta?: TransportMeta): Reporter {
	const wpKernelReporter = getWPKernelReporter();
	const override = meta?.reporter
		? meta.reporter.child('transport')
		: wpKernelReporter?.child(
				meta?.resourceName
					? `transport.${meta.resourceName}`
					: 'transport'
			);

	return resolveKernelReporter({
		override,
		fallback: () => createNoopReporter(),
	});
}

/**
 * Resolve the WordPress hooks API used for transport event emission.
 *
 * Returns `null` outside the browser so SSR environments avoid wp.hooks.
 *
 * @category HTTP
 */
function getHooks() {
	if (typeof window === 'undefined') {
		return null;
	}

	const globalWp = (
		window as Window & {
			wp?: {
				hooks?: {
					doAction?: (event: string, data: unknown) => void;
				};
			};
		}
	).wp;
	return globalWp?.hooks || null;
}

/**
 * Build a REST request path with merged query parameters.
 *
 * @param    path   - REST API path or absolute URL
 * @param    query  - Query parameters to append
 * @param    fields - REST `_fields` whitelist
 * @category HTTP
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
 * Normalize WordPress REST API errors to `WPKernelError` instances.
 *
 * @param    error     - Thrown error from the transport layer
 * @param    requestId - Generated request correlation identifier
 * @param    method    - HTTP method used for the request
 * @param    path      - Path or URL used for the request
 * @category HTTP
 */
function normalizeError(
	error: unknown,
	requestId: string,
	method: string,
	path: string
): WPKernelError {
	// Already a WPKernelError
	if (error instanceof WPKernelError) {
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

		return new WPKernelError('ServerError', {
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
		return new WPKernelError('TransportError', {
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
	return new WPKernelError('TransportError', {
		message: 'Unknown transport error',
		context: {
			requestId,
			method,
			path,
			error: String(error),
		},
	});
}

type ApiFetchOptions = {
	path?: string;
	url?: string;
	method?: string;
	data?: unknown;
	parse?: boolean;
};

type ApiFetchFn = (options: ApiFetchOptions) => Promise<unknown>;

function resolveApiFetch(
	requestId: string,
	method: string,
	fullPath: string
): ApiFetchFn {
	if (typeof window === 'undefined') {
		throw new WPKernelError('DeveloperError', {
			message: 'Cannot execute fetch during server-side rendering (SSR).',
			context: { requestId, method, path: fullPath },
		});
	}

	const globalWp = (
		window as Window & {
			wp?: {
				apiFetch?: ApiFetchFn;
			};
		}
	).wp;

	const apiFetch = globalWp?.apiFetch;

	if (!apiFetch) {
		throw new WPKernelError('DeveloperError', {
			message:
				'@wordpress/api-fetch is not available. Ensure it is loaded as a dependency.',
			context: { requestId, method, path: fullPath },
		});
	}

	return apiFetch;
}

/**
 * Emit request event via hooks.
 * Each helper performs its own null check for isolation and testability,
 * rather than relying on an early guard in the caller.
 *
 * @param hooks     - WordPress hooks instance
 * @param requestId - Unique request identifier
 * @param request   - Transport request object
 */
function emitRequestEvent(
	hooks: ReturnType<typeof getHooks>,
	requestId: string,
	request: TransportRequest
): void {
	if (!hooks?.doAction) {
		return;
	}

	const requestEvent: ResourceRequestEvent = {
		requestId,
		method: request.method,
		path: request.path,
		query: request.query,
		timestamp: Date.now(),
	};
	hooks.doAction(WPK_EVENTS.RESOURCE_REQUEST, requestEvent);
}

function emitResponseEvent<T>(
	hooks: ReturnType<typeof getHooks>,
	request: TransportRequest,
	response: TransportResponse<T>,
	duration: number
): void {
	if (!hooks?.doAction) {
		return;
	}

	const responseEvent: ResourceResponseEvent<T> = {
		requestId: response.requestId,
		method: request.method,
		path: request.path,
		status: response.status,
		data: response.data,
		duration,
		timestamp: Date.now(),
	};
	hooks.doAction(WPK_EVENTS.RESOURCE_RESPONSE, responseEvent);
}

function emitErrorEvent(
	hooks: ReturnType<typeof getHooks>,
	request: TransportRequest,
	error: WPKernelError,
	duration: number
): void {
	if (!hooks?.doAction) {
		return;
	}

	const errorEvent: ResourceErrorEvent = {
		requestId: error.context?.requestId as string,
		method: request.method,
		path: request.path,
		code: error.code,
		message: error.message,
		status:
			error.data && typeof error.data === 'object'
				? (error.data as { status?: number }).status
				: undefined,
		duration,
		timestamp: Date.now(),
	};
	hooks.doAction(WPK_EVENTS.RESOURCE_ERROR, errorEvent);
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
 * @throws WPKernelError on request failure
 *
 * @example
 * ```typescript
 * import { fetch } from '@wpkernel/core/http';
 *
 * const response = await fetch<Thing>({
 *   path: '/my-plugin/v1/things/123',
 *   method: 'GET'
 * });
 *
 * console.log(response.data); // Thing object
 * console.log(response.requestId); // 'req_1234567890_abc123'
 * ```
 *
 * @category HTTP
 */
export async function fetch<T = unknown>(
	request: TransportRequest
): Promise<TransportResponse<T>> {
	const requestId = request.requestId || generateRequestId();
	const startTime = performance.now();
	const hooks = getHooks();
	const reporter = resolveTransportReporter(request.meta);

	// Build URL with query params and _fields
	const fullPath = buildUrl(request.path, request.query, request.fields);

	reporter.debug(TRANSPORT_LOG_MESSAGES.request, {
		requestId,
		method: request.method,
		path: request.path,
		namespace: request.meta?.namespace,
		resourceName: request.meta?.resourceName,
	});

	emitRequestEvent(hooks, requestId, request);

	try {
		const apiFetch = resolveApiFetch(requestId, request.method, fullPath);

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

		emitResponseEvent(hooks, request, response, duration);
		reporter.info(TRANSPORT_LOG_MESSAGES.response, {
			requestId,
			method: request.method,
			path: request.path,
			duration,
			namespace: request.meta?.namespace,
			resourceName: request.meta?.resourceName,
		});
		return response;
	} catch (error) {
		const duration = performance.now() - startTime;
		const wpKernelError = normalizeError(
			error,
			requestId,
			request.method,
			fullPath
		);

		emitErrorEvent(hooks, request, wpKernelError, duration);
		reporter.error(TRANSPORT_LOG_MESSAGES.error, {
			requestId,
			method: request.method,
			path: request.path,
			duration,
			namespace: request.meta?.namespace,
			resourceName: request.meta?.resourceName,
			error: wpKernelError.message,
		});
		throw wpKernelError;
	}
}
