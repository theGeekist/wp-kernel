import type {
	KernelInstance,
	KernelUIRuntime,
	KernelUIAttach,
	UIIntegrationOptions,
} from '@geekist/wp-kernel/data';
import {
	getRegisteredResources,
	type ResourceDefinedEvent,
} from '@geekist/wp-kernel';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import { attachResourceHooks } from '../hooks/resource-hooks';

type RuntimePolicy = NonNullable<KernelUIRuntime['policies']>['policy'];

function resolvePolicyRuntime(): KernelUIRuntime['policies'] {
	const runtime = (
		globalThis as {
			__WP_KERNEL_ACTION_RUNTIME__?: { policy?: RuntimePolicy };
		}
	).__WP_KERNEL_ACTION_RUNTIME__;

	if (!runtime?.policy) {
		return undefined;
	}

	return { policy: runtime.policy };
}

function attachExistingResources(
	runtime: KernelUIRuntime,
	resources: ResourceDefinedEvent[]
): void {
	resources.forEach((event) => {
		attachResourceHooks(
			event.resource as ResourceObject<unknown, unknown>,
			runtime
		);
	});
}

export const attachUIBindings: KernelUIAttach = (
	kernel: KernelInstance,
	options?: UIIntegrationOptions
): KernelUIRuntime => {
	const runtime: KernelUIRuntime = {
		kernel,
		namespace: kernel.getNamespace(),
		reporter: kernel.getReporter(),
		registry: kernel.getRegistry(),
		events: kernel.events,
		policies: resolvePolicyRuntime(),
		invalidate: (patterns, invalidateOptions) =>
			kernel.invalidate(patterns, invalidateOptions),
		options,
	};

	attachExistingResources(runtime, getRegisteredResources());

	runtime.events.on('resource:defined', ({ resource }) => {
		attachResourceHooks(
			resource as ResourceObject<unknown, unknown>,
			runtime
		);
	});

	return runtime;
};
