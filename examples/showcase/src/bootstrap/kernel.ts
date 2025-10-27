import {
	configureWPKernel,
	type WPKInstance,
	type WPKernelRegistry,
} from '@wpkernel/core/data';
import { attachUIBindings } from '@wpkernel/ui';
import { wpkConfig } from '../wpk.config';

let wpkernelInstance: WPKInstance | undefined;

export function bootstrapKernel(registry?: WPKernelRegistry): WPKInstance {
	wpkernelInstance = configureWPKernel({
		namespace: wpkConfig.namespace,
		registry,
		ui: { attach: attachUIBindings },
	});

	return wpkernelInstance;
}

export function getKernel(): WPKInstance {
	if (!wpkernelInstance) {
		wpkernelInstance = bootstrapKernel();
	}

	return wpkernelInstance;
}

export const kernel = new Proxy({} as WPKInstance, {
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
