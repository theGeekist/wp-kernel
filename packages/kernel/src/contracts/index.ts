import {
	WPK_EVENTS,
	WPK_INFRASTRUCTURE,
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
} from '../namespace/constants';
import type { ErrorCode } from '../error/types';

/**
 * Ordered lifecycle phases emitted by the kernel action runtime.
 */
export const ACTION_LIFECYCLE_PHASES = ['start', 'complete', 'error'] as const;

export type ActionLifecyclePhase = (typeof ACTION_LIFECYCLE_PHASES)[number];

/**
 * WordPress hook event names keyed by lifecycle phase.
 */
export const ACTION_LIFECYCLE_EVENT_HOOKS: Record<
	ActionLifecyclePhase,
	string
> = {
	start: WPK_EVENTS.ACTION_START,
	complete: WPK_EVENTS.ACTION_COMPLETE,
	error: WPK_EVENTS.ACTION_ERROR,
} as const;

/**
 * Kernel event bus topics keyed by lifecycle phase.
 */
export const ACTION_LIFECYCLE_BUS_EVENTS = {
	start: 'action:start',
	complete: 'action:complete',
	error: 'action:error',
} as const satisfies Record<ActionLifecyclePhase, string>;

/**
 * Supported KernelError codes. Downstream packages should narrow to this union
 * instead of hard-coding string literals.
 */
export const KERNEL_ERROR_CODES = [
	'TransportError',
	'ServerError',
	'PolicyDenied',
	'ValidationError',
	'TimeoutError',
	'NotImplementedError',
	'DeveloperError',
	'DeprecatedError',
	'UnknownError',
] as const satisfies ReadonlyArray<ErrorCode>;

export type KernelErrorCode = (typeof KERNEL_ERROR_CODES)[number];

/**
 * Shared namespace contract including subsystem namespaces used for reporters
 * and telemetry payloads.
 */
export const KERNEL_NAMESPACE_CONTRACT = {
	framework: WPK_NAMESPACE,
	subsystems: WPK_SUBSYSTEM_NAMESPACES,
} as const;

/**
 * Observability channels used by lifecycle telemetry. Consumers should adopt
 * these identifiers when broadcasting or listening for action events.
 */
export const KERNEL_OBSERVABILITY_CHANNELS = {
	broadcast: {
		channel: WPK_INFRASTRUCTURE.ACTIONS_CHANNEL,
		messageTypes: {
			lifecycle: WPK_INFRASTRUCTURE.ACTIONS_MESSAGE_TYPE_LIFECYCLE,
			customEvent: WPK_INFRASTRUCTURE.ACTIONS_MESSAGE_TYPE_EVENT,
		},
	},
	hooks: ACTION_LIFECYCLE_EVENT_HOOKS,
	bus: ACTION_LIFECYCLE_BUS_EVENTS,
} as const;

/**
 * Canonical exit codes shared by the CLI and other tooling pipelines. Extend
 * this object when new error categories are introduced.
 */
export const KERNEL_EXIT_CODES = {
	SUCCESS: 0,
	VALIDATION_ERROR: 1,
	PRINTER_FAILURE: 2,
	EXTENSION_FAILURE: 3,
} as const;

export type KernelExitCode =
	(typeof KERNEL_EXIT_CODES)[keyof typeof KERNEL_EXIT_CODES];
