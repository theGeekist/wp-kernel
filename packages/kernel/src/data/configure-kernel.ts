import { withKernel } from './registry';
import type {
	KernelRegistry,
	KernelRegistryOptions,
	ConfigureKernelOptions,
	KernelInstance,
	KernelUIConfig,
} from './types';
import { getNamespace as detectNamespace } from '../namespace/detect';
import { createReporter } from '../reporter';
import type { Reporter } from '../reporter';
import { invalidate as invalidateCache } from '../resource/cache';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';
import { getHooks } from '../actions/context';
import { KernelError } from '../error/KernelError';
import type { ReduxMiddleware } from '../actions/types';

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
} {
	return {
		enable: Boolean(config?.enable),
		options: config?.options,
	};
}

function createRegistryOptions(
	namespace: string,
	reporter: Reporter,
	middleware?: ReduxMiddleware[]
): KernelRegistryOptions {
	return {
		namespace,
		reporter,
		middleware,
	};
}

function emitEvent(eventName: string, payload: unknown): void {
	if (!eventName || typeof eventName !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'kernel emit requires a non-empty string event name.',
		});
	}

	const hooks = getHooks();
	hooks?.doAction(eventName, payload);
}

export function configureKernel(
	options: ConfigureKernelOptions = {}
): KernelInstance {
	const registry = resolveRegistry(options.registry);
	const namespace = resolveNamespace(options.namespace);
	const reporter = resolveReporter(namespace, options.reporter);
	const ui = normalizeUIConfig(options.ui);

	let teardown: () => void = () => undefined;

	if (registry) {
		const cleanup = withKernel(
			registry,
			createRegistryOptions(namespace, reporter, options.middleware)
		);
		teardown = cleanup;
	}

	return {
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
			invalidateCache(patterns, opts);
		},
		emit(eventName: string, payload: unknown) {
			emitEvent(eventName, payload);
		},
		teardown() {
			teardown();
		},
		getRegistry() {
			return registry;
		},
		ui: {
			isEnabled() {
				return ui.enable;
			},
			options: ui.options,
		},
	};
}
