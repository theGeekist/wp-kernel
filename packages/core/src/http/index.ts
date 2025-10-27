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
