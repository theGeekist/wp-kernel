import { WPKernelError } from '../error/WPKernelError';
import type { ActionLifecycleEvent, ResolvedActionOptions } from './types';

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
