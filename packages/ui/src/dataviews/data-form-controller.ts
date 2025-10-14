import { useCallback } from 'react';
import type { DefinedAction } from '@wpkernel/core/actions';
import type { KernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern, ResourceObject } from '@wpkernel/core/resource';
import { useAction } from '../hooks/useAction';
import type { DataViewsRuntimeContext } from './types';
import { normalizeActionError } from './error-utils';

interface DataFormControllerState<TResult> {
	status: 'idle' | 'running' | 'success' | 'error';
	error?: KernelError;
	inFlight: number;
	result?: TResult;
}

export interface UseDataFormController<TResult> {
	submit: (input: unknown) => Promise<TResult>;
	reset: () => void;
	cancel: () => void;
	state: DataFormControllerState<TResult>;
}

interface CreateDataFormControllerOptions<TInput, TResult, TQuery> {
	action: DefinedAction<TInput, TResult>;
	runtime: DataViewsRuntimeContext;
	resource?: ResourceObject<unknown, TQuery>;
	resourceName: string;
	invalidate?: (result: TResult, input: TInput) => CacheKeyPattern[] | false;
	onSuccess?: (result: TResult) => void;
	onError?: (error: KernelError) => void;
}

function defaultInvalidate<TResult, TQuery>(
	resource?: ResourceObject<unknown, TQuery>
): (result: TResult, input: unknown) => CacheKeyPattern[] | false {
	if (!resource) {
		return () => false;
	}
	return () => [resource.key('list')];
}

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
