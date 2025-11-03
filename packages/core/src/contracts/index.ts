/**
 * WP Kernel Contracts Surface
 *
 * Centralises shared framework contracts so that all packages consume the
 * same lifecycle phases, namespace constants, exit codes, and error typing.
 * Importing from this module guarantees a consistent, auditable contract
 * across Core, UI, CLI, and E2E tooling.
 */

import type { ActionLifecycleEvent } from '../actions/types.js';
import {
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
	WPK_INFRASTRUCTURE,
	WPK_EVENTS,
	WPK_CONFIG_SOURCES,
	type WPKConfigSource,
} from '../namespace/constants.js';
import { WPKernelError } from '../error/WPKernelError.js';
import type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from '../error/types.js';

/**
 * Canonical lifecycle phases emitted by Actions.
 */
export const ACTION_LIFECYCLE_PHASES = [
	'start',
	'complete',
	'error',
] as const satisfies ReadonlyArray<ActionLifecycleEvent['phase']>;

/**
 * Type-safe lifecycle phase union derived from the ACTION_LIFECYCLE_PHASES constant.
 */
export type ActionLifecyclePhase = (typeof ACTION_LIFECYCLE_PHASES)[number];

/**
 * Framework-wide exit codes for CLI tooling and scripts.
 */
export const WPK_EXIT_CODES = {
	/** Command completed successfully. */
	SUCCESS: 0,
	/** User/action validation failed. */
	VALIDATION_ERROR: 1,
	/** Runtime failure outside adapter evaluation. */
	UNEXPECTED_ERROR: 2,
	/** Adapter or extension evaluation failed. */
	ADAPTER_ERROR: 3,
} as const;

/**
 * Union of supported WP Kernel exit code values.
 */
export type WPKExitCode = (typeof WPK_EXIT_CODES)[keyof typeof WPK_EXIT_CODES];

/**
 * Serialize WPKernelErrors to the canonical JSON shape.
 *
 * @param error WPKernelError instance to serialize.
 */
export function serializeWPKernelError(error: WPKernelError): SerializedError {
	return error.toJSON();
}

// Namespace exports ----------------------------------------------------------------

export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
	WPKConfigSource,
};

export {
	WPKernelError,
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
	WPK_INFRASTRUCTURE,
	WPK_EVENTS,
	WPK_CONFIG_SOURCES,
};
