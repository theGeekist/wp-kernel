import { createActionPipeline } from '@wpkernel/core/pipeline/actions/createActionPipeline';
import type { ActionPipeline } from '@wpkernel/core/pipeline/actions/types';
import { createMemoryReporter } from './memory-reporter.test-support';
import type { MemoryReporter } from './memory-reporter.test-support';

interface RuntimeOverrides {
	readonly reporter?: unknown;
	readonly [key: string]: unknown;
}

export interface BuildCoreActionPipelineHarnessOptions<TArgs, TResult> {
	readonly namespace?: string;
	readonly runtime?: RuntimeOverrides;
	readonly pipelineFactory?: () => ActionPipeline<TArgs, TResult>;
}

export interface CoreActionPipelineHarness<TArgs, TResult> {
	readonly pipeline: ActionPipeline<TArgs, TResult>;
	readonly reporter: MemoryReporter;
	readonly namespace: string;
	teardown: () => void;
}

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
