import { createElement, type ReactNode } from 'react';
import { WPKernelEventBus } from '@wpkernel/core/events';
import type {
	WPKInstance,
	WPKernelRegistry,
	WPKernelUIRuntime,
} from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/contracts';
import {
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '../core/wp-harness.js';
import { createReporterMock } from '../shared/reporter.js';

type WPKernelUIProviderComponent = (props: {
	runtime: WPKernelUIRuntime;
	children: ReactNode;
}) => ReturnType<typeof createElement>;

export interface KernelUITestHarnessOptions {
	reporter?: Partial<Reporter>;
	namespace?: string;
	provider?: WPKernelUIProviderComponent;
}

export interface KernelUITestHarness {
	wordpress: WordPressTestHarness;
	createRuntime: (
		overrides?: Partial<WPKernelUIRuntime>
	) => WPKernelUIRuntime;
	createWrapper: (
		runtime?: WPKernelUIRuntime
	) => ({
		children,
	}: {
		children: ReactNode;
	}) => ReturnType<typeof createElement>;
	resetActionStoreRegistration: () => void;
	suppressConsoleError: (predicate: (args: unknown[]) => boolean) => void;
	restoreConsoleError: () => void;
	teardown: () => void;
}

function buildRuntime(
	registry: WPKernelRegistry | undefined,
	options: KernelUITestHarnessOptions,
	overrides: Partial<WPKernelUIRuntime> = {}
): WPKernelUIRuntime {
	const reporter = createReporterMock({
		overrides: options.reporter,
	});

	return {
		namespace: options.namespace ?? 'tests',
		reporter,
		registry,
		events: new WPKernelEventBus(),
		invalidate: jest.fn(),
		kernel: overrides.kernel as WPKInstance | undefined,
		policies: overrides.policies,
		options: overrides.options,
	} satisfies WPKernelUIRuntime;
}

function createWrapper(
	runtime: WPKernelUIRuntime,
	provider: WPKernelUIProviderComponent
) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(provider, { runtime, children });
	};
}

const ACTION_STORE_MARKER = Symbol.for('wpKernelUIActionStoreRegistered');

export function createKernelUITestHarness(
	options: KernelUITestHarnessOptions = {}
): KernelUITestHarness {
	const wordpress = createWordPressTestHarness();
	let currentConsoleError = console.error;
	const provider = options.provider;

	if (!provider) {
		throw new WPKernelError('DeveloperError', {
			message:
				'KernelUITestHarness requires a WPKernelUIProvider. Pass options.provider when calling createKernelUITestHarness.',
		});
	}

	return {
		wordpress,
		createRuntime: (overrides = {}) =>
			buildRuntime(
				wordpress.wp?.data as WPKernelRegistry | undefined,
				options,
				overrides
			),
		createWrapper: (runtime) =>
			createWrapper(
				runtime ??
					buildRuntime(
						wordpress.wp?.data as WPKernelRegistry | undefined,
						options
					),
				provider
			),
		resetActionStoreRegistration: () => {
			const wpData = wordpress.wp.data as {
				[ACTION_STORE_MARKER]?: unknown;
			};
			if (ACTION_STORE_MARKER in wpData) {
				delete wpData[ACTION_STORE_MARKER];
			}
		},
		suppressConsoleError: (predicate) => {
			currentConsoleError = console.error;
			console.error = (...args: unknown[]) => {
				if (predicate(args)) {
					return;
				}
				const typedArgs = args as Parameters<typeof console.error>;
				return currentConsoleError(...typedArgs);
			};
		},
		restoreConsoleError: () => {
			console.error = currentConsoleError;
		},
		teardown: () => {
			console.error = currentConsoleError;
			wordpress.teardown();
		},
	};
}
