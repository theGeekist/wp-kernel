import type { WPDataRegistry } from '@wordpress/data/build-types/registry';
import type { ReduxMiddleware } from '../actions/types';
import type { Reporter } from '../reporter';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';
import type { WPKernelEventBus } from '../events/bus';
import type { PolicyHelpers } from '../policy/types';
import type { ResourceConfig, ResourceObject } from '../resource/types';

export type WPKernelRegistry = WPDataRegistry & {
	__experimentalUseMiddleware?: (
		middleware: () => ReduxMiddleware[]
	) => (() => void) | void;
	dispatch: (storeName: string) => unknown;
};

export interface WPKUIConfig {
	enable?: boolean;
	attach?: WPKernelUIAttach;
	options?: UIIntegrationOptions;
}

export interface ConfigureWPKernelOptions {
	namespace?: string;
	registry?: WPKernelRegistry;
	reporter?: Reporter;
	middleware?: ReduxMiddleware[];
	ui?: WPKUIConfig;
	corePipeline?: {
		enabled?: boolean;
	};
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

export interface WPKUIPolicyRuntime {
	policy?: Partial<PolicyHelpers<Record<string, unknown>>> & {
		cache?: PolicyHelpers<Record<string, unknown>>['cache'];
	};
}

export interface WPKernelUIRuntime {
	kernel?: WPKInstance;
	namespace: string;
	reporter: Reporter;
	registry?: WPKernelRegistry;
	events: WPKernelEventBus;
	policies?: WPKUIPolicyRuntime;
	invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	options?: UIIntegrationOptions;
}

export type WPKernelUIAttach = (
	kernel: WPKInstance,
	options?: UIIntegrationOptions
) => WPKernelUIRuntime;

export interface WPKInstance {
	getNamespace: () => string;
	getReporter: () => Reporter;
	invalidate: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	emit: (eventName: string, payload: unknown) => void;
	teardown: () => void;
	getRegistry: () => WPKernelRegistry | undefined;
	hasUIRuntime: () => boolean;
	getUIRuntime: () => WPKernelUIRuntime | undefined;
	attachUIBindings: (
		attach: WPKernelUIAttach,
		options?: UIIntegrationOptions
	) => WPKernelUIRuntime;
	ui: {
		isEnabled: () => boolean;
		options?: WPKUIConfig['options'];
	};
	events: WPKernelEventBus;
	defineResource: <T = unknown, TQuery = unknown>(
		config: ResourceConfig<T, TQuery>
	) => ResourceObject<T, TQuery>;
}
