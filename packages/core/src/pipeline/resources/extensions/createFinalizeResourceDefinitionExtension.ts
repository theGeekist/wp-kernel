import {
	getWPKernelEventBus,
	recordResourceDefined,
	removeResourceDefined,
} from '../../../events/bus';
import type { ResourceDefinedEvent } from '../../../events/bus';
import type { PipelineExtension } from '../../types';
import type {
	ResourcePipeline,
	ResourcePipelineArtifact,
	ResourcePipelineBuildOptions,
	ResourcePipelineContext,
} from '../types';

/**
 * Create a pipeline extension that publishes resource definition events.
 *
 * The extension records the resource definition during the commit phase so the
 * shared event bus only emits `resource:defined` after the pipeline has
 * produced a resource artifact. If any downstream extension throws, the
 * extension rolls back by removing the recorded definition before the error
 * bubbles, keeping the registry state consistent.
 *
 * @example
 * ```ts
 * const pipeline = createResourcePipeline<Post, PostQuery>();
 * pipeline.extensions.use(createFinalizeResourceDefinitionExtension());
 *
 * const { artifact } = pipeline.run(runOptions);
 * // At this point the definition event has been emitted once and will be
 * // removed automatically if a later extension rejects.
 * ```
 */
export function createFinalizeResourceDefinitionExtension<
	T,
	TQuery,
>(): PipelineExtension<
	ResourcePipeline<T, TQuery>,
	ResourcePipelineContext<T, TQuery>,
	ResourcePipelineBuildOptions<T, TQuery>,
	ResourcePipelineArtifact<T, TQuery>
> {
	return {
		key: 'core.resource.finalize-definition',
		register: () => {
			return ({ artifact, context }) => {
				let definition: ResourceDefinedEvent<T, TQuery> | undefined;

				return {
					commit() {
						const resource = artifact.resource;

						if (!resource) {
							return;
						}

						const resourceDefinition: ResourceDefinedEvent<
							T,
							TQuery
						> = {
							namespace: context.namespace,
							resource,
						};

						definition = resourceDefinition;

						recordResourceDefined(resourceDefinition);
						getWPKernelEventBus().emit(
							'resource:defined',
							resourceDefinition as ResourceDefinedEvent<
								unknown,
								unknown
							>
						);
					},
					rollback() {
						if (!definition) {
							return;
						}

						removeResourceDefined(definition);
						definition = undefined;
					},
				};
			};
		},
	} satisfies PipelineExtension<
		ResourcePipeline<T, TQuery>,
		ResourcePipelineContext<T, TQuery>,
		ResourcePipelineBuildOptions<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>
	>;
}
