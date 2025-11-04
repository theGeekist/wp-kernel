import { createActionPipeline } from '@wpkernel/core/pipeline/actions/createActionPipeline';
import type { ActionPipeline } from '@wpkernel/core/pipeline/actions/types';
import { createMemoryReporter } from './memory-reporter.test-support';
import type { MemoryReporter } from './memory-reporter.test-support';

interface RuntimeOverrides {
	readonly reporter?: unknown;
	readonly [key: string]: unknown;
}

/**
 * Options for building a `CoreActionPipelineHarness`.
 *
 * @category Action Pipeline
 */
export interface BuildCoreActionPipelineHarnessOptions<TArgs, TResult> {
	/** The namespace for the reporter. */
	readonly namespace?: string;
	/** Overrides for the action runtime. */
	readonly runtime?: RuntimeOverrides;
	/** A factory function to create the action pipeline. */
	readonly pipelineFactory?: () => ActionPipeline<TArgs, TResult>;
}

/**
 * A harness for testing action pipelines.
 *
 * @category Action Pipeline
 */
export interface CoreActionPipelineHarness<TArgs, TResult> {
	/** The action pipeline instance. */
	readonly pipeline: ActionPipeline<TArgs, TResult>;
	/** The memory reporter instance. */
	readonly reporter: MemoryReporter;
	/** The namespace of the reporter. */
	readonly namespace: string;
	/** A function to clean up the harness. */
	teardown: () => void;
}

/**
 * Builds a harness for testing core action pipelines.
 *
 * @category Action Pipeline
 * @param    options - Options for configuring the harness.
 * @returns A `CoreActionPipelineHarness` instance.
 */
export function buildCoreActionPipelineHarness<TArgs, TResult>(
	options: BuildCoreActionPipelineHarnessOptions<TArgs, TResult> = {}
): CoreActionPipelineHarness<TArgs, TResult> {
	const namespace = options.namespace ?? 'tests';
	const reporter = createMemoryReporter(namespace);
	const globalRuntime = globalThis as {
		__WP_KERNEL_ACTION_RUNTIME__?: Record<string, unknown>;
	};
	const previousRuntime = globalRuntime.__WP_KERNEL_ACTION_RUNTIME__;
	const nextRuntime = {
		...(previousRuntime ?? {}),
		...options.runtime,
		reporter: (options.runtime?.reporter ?? reporter.reporter) as unknown,
	} as RuntimeOverrides;

	globalRuntime.__WP_KERNEL_ACTION_RUNTIME__ = nextRuntime;

	const pipelineFactory =
		options.pipelineFactory ??
		(() => createActionPipeline<TArgs, TResult>());
	const pipeline = pipelineFactory();

	const teardown = () => {
		if (typeof previousRuntime === 'undefined') {
			delete globalRuntime.__WP_KERNEL_ACTION_RUNTIME__;
		} else {
			globalRuntime.__WP_KERNEL_ACTION_RUNTIME__ = previousRuntime;
		}
	};

	return {
		pipeline,
		reporter,
		namespace,
		teardown,
	};
}
