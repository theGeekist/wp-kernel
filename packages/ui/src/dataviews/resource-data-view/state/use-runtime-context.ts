import { useMemo } from 'react';
import { useOptionalWPKernelUI } from '../../../runtime/context';
import { resolveRuntime } from '../runtime-resolution';
import type { ResourceDataViewRuntimeInput } from '../types/props';

export function useRuntimeContext(runtime: ResourceDataViewRuntimeInput) {
	const runtimeFromHook = useOptionalWPKernelUI();

	return useMemo(
		() => resolveRuntime(runtime, runtimeFromHook).context,
		[runtime, runtimeFromHook]
	);
}
