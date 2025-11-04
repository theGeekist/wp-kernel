import { useCallback } from 'react';
import type { DefinedAction } from '@wpkernel/core/actions';
import type { WPKernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern, ResourceObject } from '@wpkernel/core/resource';
import { useAction } from '../hooks/useAction';
import type { DataViewsRuntimeContext } from './types';
import { normalizeActionError } from './error-utils';

/**
 * Represents the state of a data form submission.
 *
 * @category DataViews Integration
 * @template TResult - The type of the result returned by the form submission action.
 */
interface DataFormControllerState<TResult> {
	/** The current status of the form submission. */
	status: 'idle' | 'running' | 'success' | 'error';
	/** Any error that occurred during submission. */
	error?: WPKernelError;
	/** The number of in-flight submissions. */
	inFlight: number;
	/** The result of the last successful submission. */
	result?: TResult;
}

/**
 * Interface for the Data Form Controller hook.
 *
 * @category DataViews Integration
 * @template TResult - The type of the result returned by the form submission action.
 */
export interface UseDataFormController<TResult> {
	/**
	 * Submits the form with the given input.
	 *
	 * @param input - The input data for the form.
	 * @returns A promise that resolves with the action's result.
	 */
	submit: (input: unknown) => Promise<TResult>;
	/** Resets the form's state. */
	reset: () => void;
	/** Cancels any in-flight form submissions. */
	cancel: () => void;
	/** The current state of the form. */
	state: DataFormControllerState<TResult>;
}

interface CreateDataFormControllerOptions<TInput, TResult, TQuery> {
	action: DefinedAction<TInput, TResult>;
	runtime: DataViewsRuntimeContext;
	resource?: ResourceObject<unknown, TQuery>;
	resourceName: string;
	invalidate?: (result: TResult, input: TInput) => CacheKeyPattern[] | false;
	onSuccess?: (result: TResult) => void;
	onError?: (error: WPKernelError) => void;
}

function defaultInvalidate<TResult, TQuery>(
	resource: ResourceObject<unknown, TQuery> | undefined
) {
	return (_result: TResult, _input: unknown): CacheKeyPattern[] | false => {
		if (resource) {
			return [resource.key('list')];
		}
		return false;
	};
}

/**
 * Creates a React hook for managing data form submissions.
 *
 * This function returns a custom React hook (`useDataFormController`) that can be used
 * to handle form submissions, action invocation, and state management (loading, error, success).
 * It integrates with `useAction` for robust action handling and can automatically invalidate
 * resource caches.
 *
 * @category DataViews Integration
 * @template TInput - The type of the input arguments for the form's action.
 * @template TResult - The type of the result returned by the form's action.
 * @template TQuery - The type of the query parameters for the associated resource (if any).
 * @param    options - Configuration options for the data form controller.
 * @returns A function that returns a `UseDataFormController` hook.
 */
export function createDataFormController<TInput, TResult, TQuery>(
	options: CreateDataFormControllerOptions<TInput, TResult, TQuery>
): () => UseDataFormController<TResult> {
	return function useDataFormController(): UseDataFormController<TResult> {
		const autoInvalidate =
			options.invalidate ??
			defaultInvalidate<TResult, TQuery>(options.resource);
		const actionRuntime = useAction(options.action, {
			autoInvalidate: (result, input) =>
				autoInvalidate(result, input as TInput),
		});
		const reporter = options.runtime.reporter;
		const onSuccess = options.onSuccess;
		const onError = options.onError;
		const resourceName = options.resourceName;
		const actionName = options.action.actionName ?? 'unknown.action';

		const submit = useCallback(
			async (input: unknown) => {
				const typedInput = input as TInput;
				try {
					const result = await actionRuntime.run(typedInput);
					onSuccess?.(result);
					return result;
				} catch (error) {
					const normalized = normalizeActionError(
						error,
						{
							actionId: actionName,
							resource: resourceName,
						},
						reporter
					);
					onError?.(normalized);
					throw normalized;
				}
			},
			[
				actionRuntime,
				actionName,
				onSuccess,
				onError,
				resourceName,
				reporter,
			]
		);

		return {
			submit,
			reset: actionRuntime.reset,
			cancel: actionRuntime.cancel,
			state: {
				status: actionRuntime.status,
				error: actionRuntime.error,
				inFlight: actionRuntime.inFlight,
				result: actionRuntime.result,
			},
		};
	};
}

export const __TESTING__ = {
	defaultInvalidate,
};
