import {
	configureKernel,
	type KernelInstance,
	type KernelRegistry,
} from '@wpkernel/core/data';
import { attachUIBindings } from '@wpkernel/ui';
import { wpkConfig } from '../wpk.config';

let kernelInstance: KernelInstance | undefined;

export function bootstrapKernel(registry?: KernelRegistry): KernelInstance {
	kernelInstance = configureKernel({
		namespace: wpkConfig.namespace,
		registry,
		ui: { attach: attachUIBindings },
	});

	return kernelInstance;
}

export function getKernel(): KernelInstance {
	if (!kernelInstance) {
		kernelInstance = bootstrapKernel();
	}

	return kernelInstance;
}

export const kernel = new Proxy({} as KernelInstance, {
	get(_target, property: PropertyKey) {
		const instance = getKernel();
		const value = (instance as unknown as Record<PropertyKey, unknown>)[
			property
		];
		if (typeof value === 'function') {
			return (value as (...args: unknown[]) => unknown).bind(instance);
		}
		return value;
	},
});
