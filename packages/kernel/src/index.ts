/**
 * WP Kernel - Core Framework Package
 *
 * Rails-like framework for building modern WordPress products
 *
 * @module
 */

/**
 * Current version of WP Kernel
 */
export const VERSION = '0.0.0';

/**
 * Error types (Sprint 1)
 */
export { KernelError, TransportError, ServerError } from './errors';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './errors';

/**
 * Module placeholders - implementations coming in future sprints
 *
 * Planned exports:
 * - defineResource (from './resource') - Sprint 1
 * - defineAction (from './actions') - Sprint 3
 * - definePolicy (from './policies') - Sprint 2
 * - defineJob (from './jobs') - Sprint 4
 * - defineInteraction (from './interactivity') - Sprint 5
 * - registerBindingSource (from './bindings') - Sprint 6
 * - events (from './events') - Sprint 1
 */

// Future module structure:
// export * from './resource';
// export * from './actions';
// export * from './policies';
// export * from './jobs';
// export * from './interactivity';
// export * from './bindings';
// export * from './events';
// export * from './errors';
