/**
 * Redux compatible middleware helper for executing WP Kernel actions.
 */

import type { DefinedAction, ReduxDispatch, ReduxMiddleware } from './types';

/**
 * Internal marker used to identify kernel action envelopes.
 */
const EXECUTE_ACTION_TYPE = '@@wp-kernel/EXECUTE_ACTION';

/**
 * Shape of the action envelope processed by the middleware.
 */
export interface ActionEnvelope<TArgs, TResult> {
	type: typeof EXECUTE_ACTION_TYPE;
	payload: {
		action: DefinedAction<TArgs, TResult>;
		args: TArgs;
	};
	meta?: Record<string, unknown>;
	__kernelAction: true;
}

/**
 * Predicate guarding action envelopes at runtime.
 * @param value
 */
function isActionEnvelope<TArgs, TResult>(
	value: unknown
): value is ActionEnvelope<TArgs, TResult> {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { type?: unknown }).type === EXECUTE_ACTION_TYPE &&
		(value as { __kernelAction?: unknown }).__kernelAction === true
	);
}

/**
 * Create a Redux compatible middleware that resolves kernel actions.
 */
export function createActionMiddleware<
	TState = unknown,
>(): ReduxMiddleware<TState> {
	return () => (next: ReduxDispatch) => (action: unknown) => {
		if (isActionEnvelope(action)) {
			const {
				payload: { action: definedAction, args },
			} = action;
			const promise = definedAction(args);
			return promise;
		}
		return next(action);
	};
}

/**
 * Create an action envelope suitable for dispatching through Redux middleware.
 * @param action
 * @param args
 * @param meta
 */
export function invokeAction<TArgs, TResult>(
	action: DefinedAction<TArgs, TResult>,
	args: TArgs,
	meta: Record<string, unknown> = {}
): ActionEnvelope<TArgs, TResult> {
	return {
		type: EXECUTE_ACTION_TYPE,
		payload: { action, args },
		meta,
		__kernelAction: true,
	};
}

export { EXECUTE_ACTION_TYPE };
