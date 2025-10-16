import { createElement, type ReactNode } from 'react';
import { KernelEventBus } from '@wpkernel/core/events';
import type {
	KernelInstance,
	KernelRegistry,
	KernelUIRuntime,
} from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import { KernelUIProvider } from '../src/runtime/index.js';
import {
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '../../core/tests/wp-environment.test-support.js';

export interface KernelUITestHarnessOptions {
	reporter?: Partial<Reporter>;
	namespace?: string;
}

export interface KernelUITestHarness {
	wordpress: WordPressTestHarness;
	createRuntime: (overrides?: Partial<KernelUIRuntime>) => KernelUIRuntime;
	createWrapper: (
		runtime?: KernelUIRuntime
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

function createReporter(overrides: Partial<Reporter> = {}): Reporter {
	const childMock = jest.fn<Reporter, []>();

	const reporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: overrides.child ?? (childMock as unknown as Reporter['child']),
		...overrides,
	};

	if (!overrides.child) {
		childMock.mockReturnValue(reporter);
	}

	return reporter;
}

function buildRuntime(
	registry: KernelRegistry | undefined,
	options: KernelUITestHarnessOptions,
	overrides: Partial<KernelUIRuntime> = {}
): KernelUIRuntime {
	const reporter = createReporter(options.reporter);

	return {
		namespace: options.namespace ?? 'tests',
		reporter,
		registry,
		events: new KernelEventBus(),
		invalidate: jest.fn(),
		kernel: overrides.kernel as KernelInstance | undefined,
		policies: overrides.policies,
		options: overrides.options,
		dataviews: overrides.dataviews,
	} satisfies KernelUIRuntime;
}

function createWrapper(runtime: KernelUIRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(KernelUIProvider, { runtime }, children);
	};
}

const ACTION_STORE_MARKER = Symbol.for('wpKernelUIActionStoreRegistered');

export function createKernelUITestHarness(
	options: KernelUITestHarnessOptions = {}
): KernelUITestHarness {
	const wordpress = createWordPressTestHarness();
	let currentConsoleError = console.error;

	return {
		wordpress,
		createRuntime: (overrides = {}) =>
			buildRuntime(
				wordpress.wp?.data as KernelRegistry | undefined,
				options,
				overrides
			),
		createWrapper: (runtime) =>
			createWrapper(
				runtime ??
					buildRuntime(
						wordpress.wp?.data as KernelRegistry | undefined,
						options
					)
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
				return currentConsoleError(...(args as [any, ...any[]]));
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
