import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import { ensureControllerRuntime, isDataViewsRuntime } from '../runtime';
import type { DataViewsRuntimeContext } from '../types';

/**
 * Resolved runtime context for DataViews integration.
 *
 * When provided a full WPKernelUIRuntime, derives a DataViewsRuntimeContext.
 * When provided a DataViewsRuntimeContext, passes it through.
 * Otherwise falls back to the hook-provided kernel runtime.
 */
export type RuntimeResolution = {
	kernelRuntime?: WPKernelUIRuntime;
	context: DataViewsRuntimeContext;
};

function isWPKernelRuntime(
	candidate: WPKernelUIRuntime | DataViewsRuntimeContext
): candidate is WPKernelUIRuntime {
	return 'namespace' in candidate && 'events' in candidate;
}

/**
 * Normalize kernel/UI runtime inputs into a `DataViewsRuntimeContext`.
 *
 * Accepts either:
 * - a full `WPKernelUIRuntime`, or
 * - a pre-built `DataViewsRuntimeContext`, or
 * - falls back to the hook runtime from `WPKernelUIProvider`.
 *
 * Throws when DataViews support is missing.
 *
 * @param    runtimeProp
 * @param    hookRuntime
 * @category DataViews Runtime
 */
export function resolveRuntime(
	runtimeProp: WPKernelUIRuntime | DataViewsRuntimeContext | undefined,
	hookRuntime: WPKernelUIRuntime | null
): RuntimeResolution {
	if (runtimeProp) {
		if (isDataViewsRuntime(runtimeProp)) {
			return { context: runtimeProp };
		}
		if (isWPKernelRuntime(runtimeProp)) {
			if (!runtimeProp.dataviews) {
				throw new DataViewsControllerError(
					'WP Kernel UI runtime is missing DataViews support. Ensure Phase 1 runtime is attached.'
				);
			}
			return {
				kernelRuntime: runtimeProp,
				context: {
					namespace: runtimeProp.namespace,
					dataviews: ensureControllerRuntime(runtimeProp.dataviews),
					capabilities: runtimeProp.capabilities,
					invalidate: runtimeProp.invalidate,
					registry: runtimeProp.registry,
					reporter: runtimeProp.reporter,
					kernel: runtimeProp.kernel,
				},
			};
		}
	}

	if (!hookRuntime) {
		throw new DataViewsControllerError(
			'WP Kernel UI runtime unavailable. Provide a runtime prop or wrap with <WPKernelUIProvider />.'
		);
	}

	if (!hookRuntime.dataviews) {
		throw new DataViewsControllerError(
			'WP Kernel UI runtime is missing DataViews support. Ensure attachUIBindings() was executed with DataViews enabled.'
		);
	}

	return {
		kernelRuntime: hookRuntime,
		context: {
			namespace: hookRuntime.namespace,
			dataviews: ensureControllerRuntime(hookRuntime.dataviews),
			capabilities: hookRuntime.capabilities,
			invalidate: hookRuntime.invalidate,
			registry: hookRuntime.registry,
			reporter: hookRuntime.reporter,
			kernel: hookRuntime.kernel,
		},
	};
}
