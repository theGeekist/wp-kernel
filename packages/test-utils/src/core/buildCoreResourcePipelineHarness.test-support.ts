import { createResourcePipeline } from '@wpkernel/core/pipeline/resources/createResourcePipeline';
import type { ResourcePipeline } from '@wpkernel/core/pipeline/resources/types';
import { createMemoryReporter } from './memory-reporter.test-support';
import type { MemoryReporter } from './memory-reporter.test-support';

/**
 * Options for building a `CoreResourcePipelineHarness`.
 *
 * @category Resource Pipeline
 */
export interface BuildCoreResourcePipelineHarnessOptions<T, TQuery> {
	/** The namespace for the reporter. */
	readonly namespace?: string;
	/** The name of the resource. */
	readonly resourceName?: string;
	/** A factory function to create the resource pipeline. */
	readonly pipelineFactory?: () => ResourcePipeline<T, TQuery>;
}

/**
 * A harness for testing resource pipelines.
 *
 * @category Resource Pipeline
 */
export interface CoreResourcePipelineHarness<T, TQuery> {
	/** The resource pipeline instance. */
	readonly pipeline: ResourcePipeline<T, TQuery>;
	/** The memory reporter instance. */
	readonly reporter: MemoryReporter;
	/** The namespace of the reporter. */
	readonly namespace: string;
	/** The name of the resource being tested. */
	readonly resourceName: string;
}

/**
 * Builds a harness for testing core resource pipelines.
 *
 * @category Resource Pipeline
 * @param    options - Options for configuring the harness.
 * @returns A `CoreResourcePipelineHarness` instance.
 */
export function buildCoreResourcePipelineHarness<T, TQuery>(
	options: BuildCoreResourcePipelineHarnessOptions<T, TQuery> = {}
): CoreResourcePipelineHarness<T, TQuery> {
	const namespace = options.namespace ?? 'tests';
	const resourceName = options.resourceName ?? 'Resource';
	const reporter = createMemoryReporter(namespace);
	const pipelineFactory =
		options.pipelineFactory ?? (() => createResourcePipeline<T, TQuery>());

	return {
		pipeline: pipelineFactory(),
		reporter,
		namespace,
		resourceName,
	};
}
