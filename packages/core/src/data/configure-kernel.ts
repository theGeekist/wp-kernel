import type {
	KernelRegistry,
	ConfigureKernelOptions,
	KernelInstance,
	KernelUIConfig,
	KernelUIAttach,
	KernelUIRuntime,
} from './types';
import { getNamespace as detectNamespace } from '../namespace/detect';
import { createReporter, setKernelReporter } from '../reporter';
import type { Reporter } from '../reporter';
import { invalidate as invalidateCache } from '../resource/cache';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';
import { WPKernelError } from '../error/WPKernelError';
import {
	getKernelEventBus,
	type KernelEventBus,
	setKernelEventBus,
} from '../events/bus';
import { createActionMiddleware } from '../actions/middleware';
import { kernelEventsPlugin } from './plugins/events';
import { defineResource as baseDefineResource } from '../resource/define';
import type { ResourceConfig, ResourceObject } from '../resource/types';

type CleanupTask = () => void;

function resolveRegistry(
	registry?: KernelRegistry
): KernelRegistry | undefined {
	if (registry) {
		return registry;
	}

	if (typeof getWPData === 'function') {
		return getWPData() as unknown as KernelRegistry | undefined;
	}

	return undefined;
}

function resolveNamespace(explicit?: string): string {
	return explicit ?? detectNamespace();
}

function resolveReporter(namespace: string, reporter?: Reporter): Reporter {
	if (reporter) {
		return reporter;
	}

	return createReporter({
		namespace,
		channel: 'all',
		level: 'debug',
	});
}

function normalizeUIConfig(config?: KernelUIConfig): {
	enable: boolean;
	options?: KernelUIConfig['options'];
	attach?: KernelUIAttach;
} {
	return {
		enable: Boolean(config?.enable ?? config?.attach),
		options: config?.options,
		attach: config?.attach,
	};
}

function emitEvent(
	bus: KernelEventBus,
	eventName: string,
	payload: unknown
): void {
	if (!eventName || typeof eventName !== 'string') {
		throw new WPKernelError('DeveloperError', {
			message: 'kernel emit requires a non-empty string event name.',
		});
	}

	bus.emit('custom:event', { eventName, payload });
}

function extractResourceName(name: string): string {
	if (!name.includes(':')) {
		return name;
	}

	const [, resourceName] = name.split(':', 2);
	return resourceName || name;
}

export function configureKernel(
	options: ConfigureKernelOptions = {}
): KernelInstance {
	const registry = resolveRegistry(options.registry);
	const namespace = resolveNamespace(options.namespace);
	const reporter = resolveReporter(namespace, options.reporter);
	const ui = normalizeUIConfig(options.ui);

	const events = getKernelEventBus();
	setKernelEventBus(events);
	setKernelReporter(reporter);
	const cleanupTasks: CleanupTask[] = [() => setKernelReporter(undefined)];
	let uiRuntime: KernelUIRuntime | undefined;

	if (
		registry &&
		typeof registry.__experimentalUseMiddleware === 'function'
	) {
		const actionMiddleware = createActionMiddleware();

		const detachActions = registry.__experimentalUseMiddleware(() => [
			actionMiddleware,
			...(options.middleware ?? []),
		]);
		if (typeof detachActions === 'function') {
			cleanupTasks.push(detachActions);
		}

		const eventsMiddleware = kernelEventsPlugin({
			reporter,
			registry,
			events,
		});

		const detachEvents = registry.__experimentalUseMiddleware(() => [
			eventsMiddleware,
		]);

		cleanupTasks.push(() => {
			if (typeof detachEvents === 'function') {
				detachEvents();
			}
			eventsMiddleware.destroy?.();
		});
	}

	const kernel: KernelInstance = {
		getNamespace() {
			return namespace;
		},
		getReporter() {
			return reporter;
		},
		invalidate(
			patterns: CacheKeyPattern | CacheKeyPattern[],
			opts?: InvalidateOptions
		) {
			invalidateCache(patterns, {
				...(opts ?? {}),
				registry,
				reporter: opts?.reporter ?? reporter.child('cache'),
				namespace,
			});
		},
		emit(eventName: string, payload: unknown) {
			emitEvent(events, eventName, payload);
		},
		teardown() {
			while (cleanupTasks.length > 0) {
				const task = cleanupTasks.pop();
				try {
					task?.();
				} catch (error) {
					if (process.env.NODE_ENV === 'development') {
						reporter.error(
							'Kernel teardown failed',
							error instanceof Error
								? error
								: new Error(String(error))
						);
					}
				}
			}
		},
		getRegistry() {
			return registry;
		},
		hasUIRuntime() {
			return Boolean(uiRuntime);
		},
		getUIRuntime() {
			return uiRuntime;
		},
		attachUIBindings(attach: KernelUIAttach, attachOptions) {
			uiRuntime = attach(kernel, attachOptions ?? ui.options);
			return uiRuntime;
		},
		ui: {
			isEnabled() {
				return Boolean(uiRuntime);
			},
			options: ui.options,
		},
		events,
		defineResource<T = unknown, TQuery = unknown>(
			resourceConfig: ResourceConfig<T, TQuery>
		): ResourceObject<T, TQuery> {
			const resourceName = extractResourceName(resourceConfig.name);
			const resourceReporter =
				resourceConfig.reporter ??
				reporter.child(`resource.${resourceName}`);

			const shouldApplyKernelNamespace =
				resourceConfig.namespace === undefined &&
				!resourceConfig.name.includes(':');

			return baseDefineResource<T, TQuery>({
				...resourceConfig,
				reporter: resourceReporter,
				...(shouldApplyKernelNamespace ? { namespace } : {}),
			});
		},
	};

	if (ui.attach && ui.enable) {
		kernel.attachUIBindings(ui.attach, ui.options);
	}

	return kernel;
}
