import { createResourcePipeline } from '@wpkernel/core/pipeline/resources/createResourcePipeline';
import type { ResourcePipeline } from '@wpkernel/core/pipeline/resources/types';
import { createMemoryReporter } from './memory-reporter.test-support';
import type { MemoryReporter } from './memory-reporter.test-support';

export interface BuildCoreResourcePipelineHarnessOptions<T, TQuery> {
	readonly namespace?: string;
	readonly resourceName?: string;
	readonly pipelineFactory?: () => ResourcePipeline<T, TQuery>;
}

export interface CoreResourcePipelineHarness<T, TQuery> {
	readonly pipeline: ResourcePipeline<T, TQuery>;
	readonly reporter: MemoryReporter;
	readonly namespace: string;
	readonly resourceName: string;
}

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
