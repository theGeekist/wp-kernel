/**
 * defineAction implementation
 */

import { KernelError } from '../error/KernelError';
import {
	createActionContext,
	emitLifecycleEvent,
	generateActionRequestId,
	resolveOptions,
} from './context';
import type {
	ActionFn,
	ActionLifecycleEvent,
	ActionOptions,
	DefinedAction,
	ResolvedActionOptions,
} from './types';

/**
 * Normalize unknown error into a KernelError instance.
 * @param error
 * @param actionName
 * @param requestId
 */
function normalizeError(
	error: unknown,
	actionName: string,
	requestId: string
): KernelError {
	if (KernelError.isKernelError(error)) {
		const context = {
			...(error.context || {}),
			actionName: error.context?.actionName ?? actionName,
			requestId: error.context?.requestId ?? requestId,
		};
		const wrapped = new KernelError(error.code, {
			message: error.message,
			data: error.data,
			context,
		});
		wrapped.stack = error.stack;
		return wrapped;
	}

	if (error instanceof Error) {
		return KernelError.wrap(error, 'UnknownError', {
			actionName,
			requestId,
		});
	}

	return new KernelError('UnknownError', {
		message: `Action \"${actionName}\" failed with non-error value`,
		data: { value: error },
		context: { actionName, requestId },
	});
}

/**
 * Build lifecycle event payload.
 * @param phase
 * @param options
 * @param actionName
 * @param requestId
 * @param namespace
 * @param extra
 */
function createLifecycleEvent(
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

/**
 * Define a WP Kernel action with lifecycle instrumentation.
 * @param actionName
 * @param fn
 * @param options
 */
export function defineAction<TArgs = void, TResult = void>(
	actionName: string,
	fn: ActionFn<TArgs, TResult>,
	options: ActionOptions = {}
): DefinedAction<TArgs, TResult> {
	if (!actionName || typeof actionName !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'defineAction requires a non-empty string action name.',
		});
	}

	if (typeof fn !== 'function') {
		throw new KernelError('DeveloperError', {
			message: `defineAction(\"${actionName}\") expects a function as the second argument.`,
		});
	}

	const resolvedOptions = resolveOptions(options);

	const action = async function executeAction(args: TArgs): Promise<TResult> {
		const requestId = generateActionRequestId();
		const context = createActionContext(
			actionName,
			requestId,
			resolvedOptions
		);
		const startEvent = createLifecycleEvent(
			'start',
			resolvedOptions,
			actionName,
			requestId,
			context.namespace,
			{ args }
		);
		emitLifecycleEvent(startEvent);
		const startTime = performance.now();

		try {
			const result = await fn(context, args);
			const duration = performance.now() - startTime;
			const completeEvent = createLifecycleEvent(
				'complete',
				resolvedOptions,
				actionName,
				requestId,
				context.namespace,
				{ result, durationMs: duration }
			);
			emitLifecycleEvent(completeEvent);
			return result;
		} catch (error) {
			const kernelError = normalizeError(error, actionName, requestId);
			const duration = performance.now() - startTime;
			const errorEvent = createLifecycleEvent(
				'error',
				resolvedOptions,
				actionName,
				requestId,
				context.namespace,
				{ error: kernelError, durationMs: duration }
			);
			emitLifecycleEvent(errorEvent);
			throw kernelError;
		}
	} as DefinedAction<TArgs, TResult>;

	Object.defineProperty(action, 'actionName', {
		value: actionName,
		enumerable: true,
		writable: false,
	});

	Object.defineProperty(action, 'options', {
		value: resolvedOptions,
		enumerable: true,
		writable: false,
	});

	return action;
}
