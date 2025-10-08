import type { WPDataRegistry } from '@wordpress/data/build-types/registry';
import type { ReduxMiddleware } from '../actions/types';
import type { Reporter } from '../reporter';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';

export type KernelRegistry = WPDataRegistry & {
	__experimentalUseMiddleware?: (
		middleware: () => ReduxMiddleware[]
	) => (() => void) | void;
	dispatch: (storeName: string) => unknown;
};

export interface KernelRegistryOptions {
	middleware?: ReduxMiddleware[];
	reporter?: Reporter;
	namespace?: string;
}

export interface KernelUIConfig {
	enable?: boolean;
	options?: Record<string, unknown>;
}

export interface ConfigureKernelOptions {
	namespace?: string;
	registry?: KernelRegistry;
	reporter?: Reporter;
	middleware?: ReduxMiddleware[];
	ui?: KernelUIConfig;
}

export interface KernelInstance {
	getNamespace: () => string;
	getReporter: () => Reporter;
	invalidate: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	emit: (eventName: string, payload: unknown) => void;
	teardown: () => void;
	getRegistry: () => KernelRegistry | undefined;
	ui: {
		isEnabled: () => boolean;
		options?: KernelUIConfig['options'];
	};
}
