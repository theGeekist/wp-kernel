/**
 * Transport Module for WP Kernel
 *
 * Provides HTTP transport layer wrapping @wordpress/api-fetch with:
 * - Request correlation via unique IDs
 * - Event emission for observability
 * - Error normalization to WPKernelError
 * - Query parameter and field filtering support
 *
 * @module
 */

/**
 * Fetches data from the WordPress REST API with WP Kernel enhancements.
 *
 * This function wraps `@wordpress/api-fetch` and adds features like request
 * correlation, event emission for observability, error normalization to
 * `WPKernelError`, and support for query parameter and field filtering.
 *
 * @category HTTP
 */
export { fetch } from './fetch';
export type {
	HttpMethod,
	TransportRequest,
	TransportResponse,
	TransportMeta,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
} from './types';
