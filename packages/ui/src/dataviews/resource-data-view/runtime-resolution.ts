import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import { ensureControllerRuntime, isDataViewsRuntime } from '../runtime';
import type { DataViewsRuntimeContext } from '../types';

export type RuntimeResolution = {
	kernelRuntime?: WPKernelUIRuntime;
	context: DataViewsRuntimeContext;
};

function isKernelRuntime(
	candidate: WPKernelUIRuntime | DataViewsRuntimeContext
): candidate is WPKernelUIRuntime {
	return 'namespace' in candidate && 'events' in candidate;
}

export function resolveRuntime(
	runtimeProp: WPKernelUIRuntime | DataViewsRuntimeContext | undefined,
	hookRuntime: WPKernelUIRuntime | null
): RuntimeResolution {
	if (runtimeProp) {
		if (isDataViewsRuntime(runtimeProp)) {
			return { context: runtimeProp };
		}
		if (isKernelRuntime(runtimeProp)) {
			if (!runtimeProp.dataviews) {
				throw new DataViewsControllerError(
					'Kernel UI runtime is missing DataViews support. Ensure Phase 1 runtime is attached.'
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
			'Kernel UI runtime unavailable. Provide a runtime prop or wrap with <WPKernelUIProvider />.'
		);
	}

	if (!hookRuntime.dataviews) {
		throw new DataViewsControllerError(
			'Kernel UI runtime is missing DataViews support. Ensure attachUIBindings() was executed with DataViews enabled.'
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
