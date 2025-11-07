import { useCallback, useMemo, useRef, useState } from 'react';
import { WPKernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import {
	invokeAction,
	type ActionEnvelope,
	type DefinedAction,
} from '@wpkernel/core/actions';
import { registerWPKernelStore } from '@wpkernel/core/data';
import { useLatest, useStableCallback } from './internal/useStableCallback';
import { useWPKernelUI } from '../runtime/context';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

interface WPDataLike {
	dispatch?: (store: string) => unknown;
}

type DispatchFunction = <TArgs, TResult>(
	envelope: ActionEnvelope<TArgs, TResult>
) => Promise<TResult>;

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';
const ACTION_STORE_MARKER = Symbol.for('wpWPKernelUIActionStoreRegistered');

type StoreMarkerRegistry = ResolvedRegistry & {
	[ACTION_STORE_MARKER]?: boolean;
};

function ensureBrowserEnvironment() {
	if (typeof window === 'undefined') {
		throw new WPKernelError('DeveloperError', {
			message:
				'useAction cannot run during SSR. Call run() on the client side.',
		});
	}
}

type ResolvedRegistry = WPDataLike & {
	dispatch: NonNullable<WPDataLike['dispatch']>;
};

function resolveWpDataRegistry(runtime: WPKernelUIRuntime): ResolvedRegistry {
	const registry = runtime.registry ?? runtime.wpk?.getRegistry();

	if (!registry?.dispatch) {
		throw new WPKernelError('DeveloperError', {
			message:
				'useAction requires the WordPress data registry. Ensure configureWPKernel() was called with a registry and attach UI bindings.',
		});
	}

	return registry as ResolvedRegistry;
}

function ensureActionStoreRegistered(wpData: ResolvedRegistry): void {
	const registry = wpData as StoreMarkerRegistry;
	if (registry[ACTION_STORE_MARKER]) {
		return;
	}

	try {
		registerWPKernelStore(ACTION_STORE_KEY, {
			reducer: (state = {}) => state,
			actions: {
				invoke: (
					...args: unknown[]
				): ActionEnvelope<unknown, unknown> =>
					args[0] as ActionEnvelope<unknown, unknown>,
			},
			selectors: {},
		});
	} catch (error) {
		const alreadyRegistered =
			error instanceof Error &&
			error.message.includes('already registered');
		if (!alreadyRegistered) {
			throw error;
		}
	}

	registry[ACTION_STORE_MARKER] = true;
}

function resolveInvokeMethod(
	wpData: ResolvedRegistry
): (envelope: ActionEnvelope<unknown, unknown>) => Promise<unknown> {
	const dispatcher = wpData.dispatch(ACTION_STORE_KEY) as
		| {
				invoke?: (
					envelope: ActionEnvelope<unknown, unknown>
				) => Promise<unknown>;
		  }
		| undefined;

	const invoke = dispatcher?.invoke;

	if (typeof invoke !== 'function') {
		throw new WPKernelError('DeveloperError', {
			message:
				'Failed to resolve wpk action dispatcher. Verify configureWPKernel() initialised the registry.',
		});
	}

	return invoke as (
		envelope: ActionEnvelope<unknown, unknown>
	) => Promise<unknown>;
}

function wrapInvoke(
	invokeMethod: (
		envelope: ActionEnvelope<unknown, unknown>
	) => Promise<unknown>
): DispatchFunction {
	const dispatchFn: DispatchFunction = <TArgs, TResult>(
		envelope: ActionEnvelope<TArgs, TResult>
	): Promise<TResult> => {
		// Type safety is maintained by the action envelope system despite WordPress data API limitations.
		return invokeMethod(
			envelope as ActionEnvelope<unknown, unknown>
		) as Promise<TResult>;
	};

	return dispatchFn;
}

function createDispatch(runtime: WPKernelUIRuntime): DispatchFunction {
	ensureBrowserEnvironment();
	const wpData = resolveWpDataRegistry(runtime);
	ensureActionStoreRegistered(wpData);
	const invokeMethod = resolveInvokeMethod(wpData);
	const dispatchFn = wrapInvoke(invokeMethod);
	return dispatchFn;
}

/**
 * Options for the useAction hook.
 *
 * @category Action Bindings
 * @public
 */
export interface UseActionOptions<TInput, TResult> {
	/**
	 * The concurrency strategy to use.
	 *
	 * - `parallel` (default): All calls run in parallel.
	 * - `switch`: Cancels all previous calls and runs the new one.
	 * - `queue`: Queues all calls and runs them sequentially.
	 * - `drop`: Drops all new calls while one is running.
	 */
	concurrency?: 'parallel' | 'switch' | 'queue' | 'drop';
	/**
	 * A function that returns a string to use for deduplicating requests.
	 *
	 * @param input - The input to the action.
	 * @returns A string to use for deduplication.
	 */
	dedupeKey?: (input: TInput) => string;
	/**
	 * A function that returns a list of cache key patterns to invalidate on success.
	 *
	 * @param result - The result of the action.
	 * @param input  - The input to the action.
	 * @returns A list of cache key patterns to invalidate, or false to skip invalidation.
	 */
	autoInvalidate?: (
		result: TResult,
		input: TInput
	) => CacheKeyPattern[] | false;
}

/**
 * The state of the useAction hook.
 *
 * @category Action Bindings
 */
export interface UseActionState<TResult> {
	/** The status of the action. */
	status: 'idle' | 'running' | 'success' | 'error';
	/** The error, if the action failed. */
	error?: WPKernelError;
	/** The result of the action. */
	result?: TResult;
	/** The number of in-flight requests. */
	inFlight: number;
}

/**
 * The result of the useAction hook.
 *
 * @category Action Bindings
 * @public
 */
export interface UseActionResult<TInput, TResult>
	extends UseActionState<TResult> {
	/**
	 * A function to run the action.
	 *
	 * @param input - The input to the action.
	 * @returns A promise that resolves with the result of the action.
	 */
	run: (input: TInput) => Promise<TResult>;
	/** A function to cancel all in-flight requests. */
	cancel: () => void;
	/** A function to reset the state of the hook. */
	reset: () => void;
}

interface RequestRecord<TResult> {
	id: number;
	promise: Promise<TResult>;
	cancelled: boolean;
	dedupeKey?: string;
}

const initialState: UseActionState<unknown> = {
	status: 'idle',
	error: undefined,
	result: undefined,
	inFlight: 0,
};

function normaliseToWPKernelError(
	value: unknown,
	message: string
): WPKernelError {
	if (WPKernelError.isWPKernelError(value)) {
		return value;
	}
	if (value instanceof Error) {
		return WPKernelError.wrap(value);
	}
	return new WPKernelError('UnknownError', {
		message,
		data: { value },
	});
}

/**
 * React hook for invoking a wpk action.
 *
 * This hook provides a convenient way to execute a `DefinedAction` and manage its lifecycle,
 * including loading states, errors, and concurrency control. It integrates with the WordPress
 * data store for dispatching actions and can automatically invalidate resource caches upon success.
 *
 * @category Action Bindings
 * @template TInput - The type of the input arguments for the action.
 * @template TResult - The type of the result returned by the action.
 * @param    action  - The `DefinedAction` to be invoked.
 * @param    options - Configuration options for the action invocation, including concurrency and invalidation.
 * @returns An object containing the action's current state (`status`, `error`, `result`, `inFlight`) and control functions (`run`, `cancel`, `reset`).
 */
export function useAction<TInput, TResult>(
	action: DefinedAction<TInput, TResult>,
	options: UseActionOptions<TInput, TResult> = {}
): UseActionResult<TInput, TResult> {
	const runtime = useWPKernelUI();
	const actionRef = useLatest(action);
	const optionsRef = useLatest(options);
	const autoInvalidateRef = useLatest(options.autoInvalidate);
	const dedupeKeyRef = useLatest(options.dedupeKey);

	const [state, setState] = useState<UseActionState<TResult>>(
		initialState as UseActionState<TResult>
	);

	const requestsRef = useRef<Map<number, RequestRecord<TResult>>>(new Map());
	const dedupeMapRef = useRef<Map<string, RequestRecord<TResult>>>(new Map());
	const queueTailRef = useRef<Promise<void> | null>(null);
	const queueGenerationRef = useRef(0);
	const idCounterRef = useRef(0);

	const markRequestCancelled = useCallback(
		(record: RequestRecord<TResult>) => {
			record.cancelled = true;
			if (record.dedupeKey) {
				dedupeMapRef.current.delete(record.dedupeKey);
			}
		},
		[]
	);

	const clearQueue = useCallback(() => {
		queueTailRef.current = null;
		queueGenerationRef.current += 1;
	}, []);

	const cancelAll = useCallback(
		(resetResult: boolean) => {
			requestsRef.current.forEach((record) => {
				markRequestCancelled(record);
			});
			requestsRef.current.clear();
			dedupeMapRef.current.clear();
			clearQueue();

			setState((prev) => ({
				status: 'idle',
				error: undefined,
				result: resetResult ? undefined : prev.result,
				inFlight: 0,
			}));
		},
		[clearQueue, markRequestCancelled]
	);

	const applySuccessState = useCallback((result: TResult) => {
		setState((prev) => {
			const nextInFlight = Math.max(prev.inFlight - 1, 0);
			return {
				status: nextInFlight > 0 ? 'running' : 'success',
				error: undefined,
				result,
				inFlight: nextInFlight,
			};
		});
	}, []);

	const applyErrorState = useCallback((error: WPKernelError) => {
		setState((prev) => {
			const nextInFlight = Math.max(prev.inFlight - 1, 0);
			return {
				status: nextInFlight > 0 ? 'running' : 'error',
				error,
				result: prev.result,
				inFlight: nextInFlight,
			};
		});
	}, []);

	const startRequest = useCallback(
		(input: TInput): Promise<TResult> => {
			const dispatch = createDispatch(runtime);
			const targetAction = actionRef.current;
			const requestId = ++idCounterRef.current;
			const dedupeKey = dedupeKeyRef.current?.(input);

			if (dedupeKey) {
				const existing = dedupeMapRef.current.get(dedupeKey);
				if (existing && !existing.cancelled) {
					return existing.promise;
				}
			}

			const record: RequestRecord<TResult> = {
				id: requestId,
				promise: Promise.resolve() as Promise<TResult>,
				cancelled: false,
				dedupeKey,
			};

			requestsRef.current.set(requestId, record);
			if (dedupeKey) {
				dedupeMapRef.current.set(dedupeKey, record);
			}

			setState((prev) => ({
				status: 'running',
				inFlight: prev.inFlight + 1,
				error: undefined,
				result: prev.result,
			}));

			const envelope = invokeAction(targetAction, input);

			let dispatchPromise: Promise<TResult>;
			try {
				dispatchPromise = Promise.resolve(dispatch(envelope));
			} catch (error) {
				markRequestCancelled(record);
				requestsRef.current.delete(requestId);
				const wpkError = normaliseToWPKernelError(
					error,
					'Dispatching action failed with non-error value'
				);
				applyErrorState(wpkError);
				throw wpkError;
			}

			const promise = dispatchPromise
				.then((result: TResult) => {
					if (!record.cancelled) {
						const invalidatePatterns = autoInvalidateRef.current?.(
							result,
							input
						);
						if (
							invalidatePatterns &&
							invalidatePatterns.length > 0
						) {
							runtime.invalidate?.(invalidatePatterns);
							if (!runtime.invalidate && runtime.wpk) {
								runtime.wpk.invalidate(invalidatePatterns);
							}
						}
						applySuccessState(result);
					}
					return result;
				})
				.catch((error: unknown) => {
					const wpkError = normaliseToWPKernelError(
						error,
						'Action failed with non-error value'
					);

					if (!record.cancelled) {
						applyErrorState(wpkError);
					}

					throw wpkError;
				})
				.finally(() => {
					if (dedupeKey) {
						dedupeMapRef.current.delete(dedupeKey);
					}
					requestsRef.current.delete(requestId);
				});

			record.promise = promise;
			return promise;
		},
		[
			actionRef,
			applyErrorState,
			applySuccessState,
			markRequestCancelled,
			autoInvalidateRef,
			dedupeKeyRef,
			runtime,
		]
	);

	const run = useCallback(
		(input: TInput) => {
			const concurrency = optionsRef.current.concurrency ?? 'parallel';

			const start = () => startRequest(input);

			const activeRequest = (): RequestRecord<TResult> | undefined =>
				Array.from(requestsRef.current.values()).find(
					(record) => !record.cancelled
				);

			switch (concurrency) {
				case 'drop': {
					const record = activeRequest();
					if (record) {
						return record.promise;
					}
					return start();
				}
				case 'switch': {
					requestsRef.current.forEach((record) => {
						markRequestCancelled(record);
					});
					requestsRef.current.clear();
					dedupeMapRef.current.clear();
					clearQueue();
					setState((prev) => ({
						status: 'running',
						inFlight: 0,
						error: undefined,
						result: prev.result,
					}));
					return start();
				}
				case 'queue': {
					const generation = queueGenerationRef.current;
					const tail =
						queueTailRef.current ?? Promise.resolve(undefined);
					const next = tail
						.catch(() => undefined)
						.then(() => {
							// Check if queue was cancelled (generation changed) before executing this queued call
							if (queueGenerationRef.current !== generation) {
								throw new WPKernelError('DeveloperError', {
									message:
										'Queued action cancelled before execution in queue concurrency mode',
								});
							}
							return start();
						});
					queueTailRef.current = next
						.then(() => undefined)
						.catch(() => undefined);
					return next;
				}
				default:
					return start();
			}
		},
		[clearQueue, markRequestCancelled, optionsRef, setState, startRequest]
	);

	const cancel = useStableCallback(() => {
		cancelAll(true);
	});

	const reset = useStableCallback(() => {
		setState({
			status: 'idle',
			error: undefined,
			result: undefined,
			inFlight: 0,
		});
	});

	return useMemo(
		() => ({
			...state,
			run,
			cancel,
			reset,
		}),
		[cancel, reset, run, state]
	);
}
