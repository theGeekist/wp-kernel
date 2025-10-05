/**
 * Action module type definitions
 *
 * Provides shared interfaces used across the actions runtime including the
 * action context surface, middleware helpers, and lifecycle metadata.
 */

import type { CacheKeyPattern } from '../resource/cache';

/**
 * Options controlling how an action propagates events.
 */
export interface ActionOptions {
	/** Event scope: whether events are cross-tab or restricted to the current tab. */
	scope?: 'crossTab' | 'tabLocal';
	/** Whether to bridge events to PHP. Ignored when scope is tabLocal. */
	bridged?: boolean;
}

/**
 * Resolved action options with defaults applied.
 */
export interface ResolvedActionOptions {
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
}

/**
 * Reporter interface used inside actions for structured logging.
 */
export interface Reporter {
	info: (message: string, context?: Record<string, unknown>) => void;
	warn: (message: string, context?: Record<string, unknown>) => void;
	error: (message: string, context?: Record<string, unknown>) => void;
	debug?: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Options for waiting on a background job.
 */
export interface WaitOptions {
	timeoutMs?: number;
	pollIntervalMs?: number;
}

/**
 * Background job orchestration surface available to actions.
 */
export interface ActionJobs {
	enqueue: <TPayload>(jobName: string, payload: TPayload) => Promise<void>;
	wait: <TPayload, TResult>(
		jobName: string,
		payload: TPayload,
		options?: WaitOptions
	) => Promise<TResult>;
}

/**
 * Policy enforcement utilities exposed to actions.
 */
export interface ActionPolicy {
	assert: (capability: string) => void;
	can: (capability: string) => boolean;
}

/**
 * Runtime metadata describing the lifecycle events emitted by actions.
 */
export interface ActionLifecycleEventBase {
	actionName: string;
	requestId: string;
	namespace: string;
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
	timestamp: number;
}

/**
 * Lifecycle event emitted when an action starts execution.
 */
export interface ActionStartEvent extends ActionLifecycleEventBase {
	phase: 'start';
	args: unknown;
}

/**
 * Lifecycle event emitted when an action completes successfully.
 */
export interface ActionCompleteEvent extends ActionLifecycleEventBase {
	phase: 'complete';
	result: unknown;
	durationMs: number;
}

/**
 * Lifecycle event emitted when an action fails.
 */
export interface ActionErrorEvent extends ActionLifecycleEventBase {
	phase: 'error';
	error: unknown;
	durationMs: number;
}

/**
 * Union type of all lifecycle events emitted by actions.
 */
export type ActionLifecycleEvent =
	| ActionStartEvent
	| ActionCompleteEvent
	| ActionErrorEvent;

/**
 * Context object passed to action implementations.
 */
export interface ActionContext {
	/** Correlation identifier shared with transport calls. */
	readonly requestId: string;
	/** Emit canonical events. */
	emit: (eventName: string, payload: unknown) => void;
	/** Invalidate cache keys. */
	invalidate: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: { storeKey?: string; emitEvent?: boolean }
	) => void;
	/** Background job helpers. */
	readonly jobs: ActionJobs;
	/** Policy enforcement helpers. */
	readonly policy: ActionPolicy;
	/** Structured logging surface. */
	readonly reporter: Reporter;
	/** Resolved namespace of the current action. */
	readonly namespace: string;
}

/**
 * Signature for action implementations supplied by consumers.
 */
export type ActionFn<TArgs, TResult> = (
	ctx: ActionContext,
	args: TArgs
) => Promise<TResult>;

/**
 * Callable action returned by defineAction.
 */
export interface DefinedAction<TArgs, TResult> {
	(args: TArgs): Promise<TResult>;
	readonly actionName: string;
	readonly options: ResolvedActionOptions;
}

/**
 * Redux compatible dispatch signature (duck-typed from Redux types).
 */
export type ReduxDispatch = (action: unknown) => unknown;

/**
 * Redux compatible middleware API signature.
 */
export interface ReduxMiddlewareAPI<TState = unknown> {
	dispatch: ReduxDispatch;
	getState: () => TState;
}

/**
 * Redux compatible middleware type without depending on redux package.
 */
export type ReduxMiddleware<TState = unknown> = (
	api: ReduxMiddlewareAPI<TState>
) => (next: ReduxDispatch) => (action: unknown) => unknown;

/**
 * Internal runtime surface injected via global for tests and host applications.
 */
export interface ActionRuntime {
	reporter?: Reporter;
	jobs?: ActionJobs;
	policy?: Partial<ActionPolicy>;
	bridge?: {
		emit: (
			eventName: string,
			payload: unknown,
			metadata: ActionLifecycleEventBase
		) => void;
	};
}

declare global {
	var __WP_KERNEL_ACTION_RUNTIME__: ActionRuntime | undefined;
}
