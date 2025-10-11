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
import {
	createKernelDataViewsRuntime,
	normalizeDataViewsOptions,
} from './dataviews/runtime';
import { createResourceDataViewController } from '../dataviews/resource-controller';
import type { ResourceDataViewConfig } from '../dataviews/types';

type RuntimePolicy = NonNullable<KernelUIRuntime['policies']>['policy'];

type ResourceDataViewMetadata<TItem, TQuery> = {
	config: ResourceDataViewConfig<TItem, TQuery>;
	preferencesKey?: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractResourceDataViewMetadata<TItem, TQuery>(
	resource: ResourceObject<TItem, TQuery>
): ResourceDataViewMetadata<TItem, TQuery> | undefined {
	const candidate = (
		resource as ResourceObject<TItem, TQuery> & {
			ui?: {
				admin?: {
					dataviews?: ResourceDataViewConfig<TItem, TQuery> & {
						preferencesKey?: string;
					};
				};
			};
		}
	).ui?.admin?.dataviews;

	if (!candidate || !isRecord(candidate)) {
		return undefined;
	}

	const { preferencesKey, ...rest } = candidate as ResourceDataViewConfig<
		TItem,
		TQuery
	> & { preferencesKey?: string };

	const config = { ...rest } as ResourceDataViewConfig<TItem, TQuery>;

	if (typeof config.mapQuery !== 'function') {
		return undefined;
	}

	return { config, preferencesKey };
}

function registerResourceDataView<TItem, TQuery>(
	runtime: KernelUIRuntime,
	resource: ResourceObject<TItem, TQuery>
): void {
	const dataviews = runtime.dataviews;

	if (!dataviews || dataviews.options.autoRegisterResources === false) {
		return;
	}

	const metadata = extractResourceDataViewMetadata(resource);

	if (!metadata) {
		return;
	}

	try {
		const controller = createResourceDataViewController<TItem, TQuery>({
			resource,
			config: metadata.config,
			runtime: dataviews,
			namespace: runtime.namespace,
			invalidate: runtime.invalidate,
			policies: runtime.policies,
			preferencesKey: metadata.preferencesKey,
			fetchList: resource.fetchList as
				| typeof resource.fetchList
				| undefined,
			prefetchList: resource.prefetchList as
				| typeof resource.prefetchList
				| undefined,
		});

		dataviews.controllers.set(resource.name, controller);
		dataviews.registry.set(resource.name, {
			resource: resource.name,
			preferencesKey: controller.preferencesKey,
			metadata: metadata.config as unknown as Record<string, unknown>,
		});

		dataviews.reporter.debug?.('Auto-registered DataViews controller', {
			resource: resource.name,
			preferencesKey: controller.preferencesKey,
		});
	} catch (error) {
		dataviews.reporter.error?.(
			'Failed to auto-register DataViews controller',
			{
				resource: resource.name,
				error,
			}
		);
	}
}

function attachExistingResources(
	runtime: KernelUIRuntime,
	resources: ResourceDefinedEvent[]
): void {
	resources.forEach((event) => {
		const resource = event.resource as ResourceObject<unknown, unknown>;
		attachResourceHooks(resource, runtime);
		registerResourceDataView(runtime, resource);
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
		// Use a getter to resolve policy runtime dynamically, allowing late registrations
		// via definePolicy() after attachUIBindings() has been called (e.g., lazy-loaded plugins)
		get policies() {
			return resolvePolicyRuntime();
		},
		invalidate: (patterns, invalidateOptions) =>
			kernel.invalidate(patterns, invalidateOptions),
		options,
	};

	const dataviewsOptions = normalizeDataViewsOptions(options?.dataviews);

	if (dataviewsOptions.enable) {
		runtime.dataviews = createKernelDataViewsRuntime(
			kernel,
			runtime,
			dataviewsOptions
		);
	}

	attachExistingResources(runtime, getRegisteredResources());

	runtime.events.on('resource:defined', ({ resource }) => {
		const definedResource = resource as ResourceObject<unknown, unknown>;
		attachResourceHooks(definedResource, runtime);
		registerResourceDataView(runtime, definedResource);
	});

	return runtime;
};
