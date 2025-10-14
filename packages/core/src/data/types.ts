import type { WPDataRegistry } from '@wordpress/data/build-types/registry';
import type { ReduxMiddleware } from '../actions/types';
import type { Reporter } from '../reporter';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';
import type { KernelEventBus } from '../events/bus';
import type { PolicyHelpers } from '../policy/types';
import type { ResourceConfig, ResourceObject } from '../resource/types';

export type KernelRegistry = WPDataRegistry & {
	__experimentalUseMiddleware?: (
		middleware: () => ReduxMiddleware[]
	) => (() => void) | void;
	dispatch: (storeName: string) => unknown;
};

export interface KernelUIConfig {
	enable?: boolean;
	attach?: KernelUIAttach;
	options?: UIIntegrationOptions;
}

export interface ConfigureKernelOptions {
	namespace?: string;
	registry?: KernelRegistry;
	reporter?: Reporter;
	middleware?: ReduxMiddleware[];
	ui?: KernelUIConfig;
}

export interface UIIntegrationOptions {
	suspense?: boolean;
	notices?: boolean;
	devtools?: boolean;
	dataviews?: {
		enable?: boolean;
		autoRegisterResources?: boolean;
		preferences?: unknown;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface KernelUIPolicyRuntime {
	policy?: Partial<PolicyHelpers<Record<string, unknown>>> & {
		cache?: PolicyHelpers<Record<string, unknown>>['cache'];
	};
}

export interface KernelUIRuntime {
	kernel?: KernelInstance;
	namespace: string;
	reporter: Reporter;
	registry?: KernelRegistry;
	events: KernelEventBus;
	policies?: KernelUIPolicyRuntime;
	invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	options?: UIIntegrationOptions;
}

export type KernelUIAttach = (
	kernel: KernelInstance,
	options?: UIIntegrationOptions
) => KernelUIRuntime;

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
	hasUIRuntime: () => boolean;
	getUIRuntime: () => KernelUIRuntime | undefined;
	attachUIBindings: (
		attach: KernelUIAttach,
		options?: UIIntegrationOptions
	) => KernelUIRuntime;
	ui: {
		isEnabled: () => boolean;
		options?: KernelUIConfig['options'];
	};
	events: KernelEventBus;
	defineResource: <T = unknown, TQuery = unknown>(
		config: ResourceConfig<T, TQuery>
	) => ResourceObject<T, TQuery>;
}
