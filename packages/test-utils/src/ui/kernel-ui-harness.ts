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

/**
 * Component type for WP Kernel UI Provider.
 *
 * @category UI Harness
 * @public
 */
export type WPKernelUIProviderComponent = (props: {
	runtime: WPKernelUIRuntime;
	children: ReactNode;
}) => ReturnType<typeof createElement>;

/**
 * Options for creating a `WPKernelUITestHarness`.
 *
 * @category UI Harness
 */
export interface WPKernelUITestHarnessOptions {
	/** Partial overrides for the reporter. */
	reporter?: Partial<Reporter>;
	/** The namespace for the runtime. */
	namespace?: string;
	/** The WPKernelUIProvider component to use. */
	provider?: WPKernelUIProviderComponent;
}

/**
 * A harness for testing UI components that interact with the WPKernel UI runtime.
 *
 * @category UI Harness
 */
export interface WPKernelUITestHarness {
	/** The WordPress test harness. */
	wordpress: WordPressTestHarness;
	/** Creates a new `WPKernelUIRuntime` instance. */
	createRuntime: (
		overrides?: Partial<WPKernelUIRuntime>
	) => WPKernelUIRuntime;
	/** Creates a React wrapper component for the WPKernel UI runtime. */
	createWrapper: (
		runtime?: WPKernelUIRuntime
	) => ({
		children,
	}: {
		children: ReactNode;
	}) => ReturnType<typeof createElement>;
	/** Resets the action store registration. */
	resetActionStoreRegistration: () => void;
	/** Suppresses console errors that match a given predicate. */
	suppressConsoleError: (predicate: (args: unknown[]) => boolean) => void;
	/** Restores the original console error function. */
	restoreConsoleError: () => void;
	/** Tears down the harness, restoring original globals. */
	teardown: () => void;
}

function buildRuntime(
	registry: WPKernelRegistry | undefined,
	options: WPKernelUITestHarnessOptions,
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
		capabilities: overrides.capabilities,
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

const ACTION_STORE_MARKER = Symbol.for('wpWPKernelUIActionStoreRegistered');

/**
 * Creates a `WPKernelUITestHarness` instance.
 *
 * @category UI Harness
 * @param    options - Options for configuring the harness.
 * @returns A `WPKernelUITestHarness` instance.
 */
export function createWPKernelUITestHarness(
	options: WPKernelUITestHarnessOptions = {}
): WPKernelUITestHarness {
	const wordpress = createWordPressTestHarness();
	let currentConsoleError = console.error;
	const provider = options.provider;

	if (!provider) {
		throw new WPKernelError('DeveloperError', {
			message:
				'WPKernelUITestHarness requires a WPKernelUIProvider. Pass options.provider when calling createWPKernelUITestHarness.',
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
