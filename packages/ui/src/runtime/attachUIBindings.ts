import type {
	WPKInstance,
	WPKernelUIRuntime,
	WPKernelUIAttach,
	UIIntegrationOptions,
} from '@wpkernel/core/data';
import {
	getRegisteredResources,
	type ResourceDefinedEvent,
} from '@wpkernel/core/events';
import type { ResourceObject } from '@wpkernel/core/resource';
import { attachResourceHooks } from '../hooks/resource-hooks';
import {
	createKernelDataViewsRuntime,
	normalizeDataViewsOptions,
} from './dataviews/runtime';
import { createResourceDataViewController } from '../dataviews/resource-controller';
import {
	normalizeResourceDataViewMetadata,
	DATA_VIEWS_METADATA_INVALID,
} from './dataviews/metadata';

type RuntimeCapability = NonNullable<
	WPKernelUIRuntime['capabilities']
>['capability'];

function resolveCapabilityRuntime(): WPKernelUIRuntime['capabilities'] {
	const runtime = (
		globalThis as {
			__WP_KERNEL_ACTION_RUNTIME__?: { capability?: RuntimeCapability };
		}
	).__WP_KERNEL_ACTION_RUNTIME__;

	if (!runtime?.capability) {
		return undefined;
	}

	return { capability: runtime.capability };
}

function registerResourceDataView<TItem, TQuery>(
	runtime: WPKernelUIRuntime,
	resource: ResourceObject<TItem, TQuery>
): void {
	const dataviews = runtime.dataviews;

	if (!dataviews || dataviews.options.autoRegisterResources === false) {
		return;
	}

	const { metadata, issues } = normalizeResourceDataViewMetadata(resource);

	if (issues.length > 0) {
		dataviews
			.getResourceReporter(resource.name)
			.error?.('Invalid DataViews metadata', {
				code: DATA_VIEWS_METADATA_INVALID,
				resource: resource.name,
				issues,
			});
		return;
	}

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
			capabilities: () => runtime.capabilities,
			preferencesKey: metadata.preferencesKey,
			fetchList: resource.fetchList,
			prefetchList: resource.prefetchList,
		});

		dataviews.controllers.set(resource.name, controller);
		dataviews.registry.set(resource.name, {
			resource: resource.name,
			preferencesKey: controller.preferencesKey,
			metadata: metadata.config as unknown as Record<string, unknown>,
		});

		dataviews.events.registered({
			resource: resource.name,
			preferencesKey: controller.preferencesKey,
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
	runtime: WPKernelUIRuntime,
	resources: ResourceDefinedEvent[]
): void {
	resources.forEach((event) => {
		const resource = event.resource as ResourceObject<unknown, unknown>;
		attachResourceHooks(resource, runtime);
		registerResourceDataView(runtime, resource);
	});
}

export const attachUIBindings: WPKernelUIAttach = (
	kernel: WPKInstance,
	options?: UIIntegrationOptions
): WPKernelUIRuntime => {
	const runtime: WPKernelUIRuntime = {
		kernel,
		namespace: kernel.getNamespace(),
		reporter: kernel.getReporter(),
		registry: kernel.getRegistry(),
		events: kernel.events,
		// Use a getter to resolve capability runtime dynamically, allowing late registrations
		// via defineCapability() after attachUIBindings() has been called (e.g., lazy-loaded plugins)
		get capabilities() {
			return resolveCapabilityRuntime();
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
