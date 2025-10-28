import { WPKernelError } from '../error/WPKernelError';
import type { ActionLifecycleEvent, ResolvedActionOptions } from './types';

/**
 * Coerce unknown failures into `WPKernelError` instances with consistent
 * metadata so lifecycle observers can rely on structured error details.
 *
 * @param error      - Unknown failure thrown during action execution.
 * @param actionName - Name of the action that produced the failure.
 * @param requestId  - Correlation identifier for the action invocation.
 */
export function normalizeActionError(
	error: unknown,
	actionName: string,
	requestId: string
): WPKernelError {
	if (WPKernelError.isWPKernelError(error)) {
		const context = {
			...(error.context || {}),
			actionName: error.context?.actionName ?? actionName,
			requestId: error.context?.requestId ?? requestId,
		};
		const wrapped = new WPKernelError(error.code, {
			message: error.message,
			data: error.data,
			context,
		});
		wrapped.stack = error.stack;
		return wrapped;
	}

	if (error instanceof Error) {
		return WPKernelError.wrap(error, 'UnknownError', {
			actionName,
			requestId,
		});
	}

	return new WPKernelError('UnknownError', {
		message: `Action "${actionName}" failed with non-error value`,
		data: { value: error },
		context: { actionName, requestId },
	});
}

/**
 * Create a structured lifecycle event payload for broadcast via the kernel
 * event bus.
 *
 * @param phase      - Lifecycle phase being emitted (start/complete/error).
 * @param options    - Resolved action configuration controlling scope/bridge.
 * @param actionName - Name of the action being executed.
 * @param requestId  - Correlation identifier for the action invocation.
 * @param namespace  - Namespace associated with the action definition.
 * @param extra      - Additional phase-specific metadata (args, result, error).
 */
export function createActionLifecycleEvent(
	phase: ActionLifecycleEvent['phase'],
	options: ResolvedActionOptions,
	actionName: string,
	requestId: string,
	namespace: string,
	extra: Partial<{
		args: unknown;
		result: unknown;
		durationMs: number;
		error: unknown;
	}>
): ActionLifecycleEvent {
	const base = {
		actionName,
		requestId,
		namespace,
		scope: options.scope,
		bridged: options.bridged,
		timestamp: Date.now(),
	} as const;

	if (phase === 'start') {
		return {
			phase,
			...base,
			args: extra.args ?? null,
		};
	}

	if (phase === 'complete') {
		return {
			phase,
			...base,
			result: extra.result,
			durationMs: extra.durationMs ?? 0,
		};
	}

	return {
		phase: 'error',
		...base,
		error: extra.error,
		durationMs: extra.durationMs ?? 0,
	};
}
