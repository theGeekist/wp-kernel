import {
	getWPKernelEventBus,
	recordResourceDefined,
	removeResourceDefined,
} from '../../../events/bus';
import type { ResourceObject } from '../../../resource/types';
import type { PipelineExtension } from '../../types';
import type {
	ResourcePipeline,
	ResourcePipelineArtifact,
	ResourcePipelineBuildOptions,
	ResourcePipelineContext,
} from '../types';

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
				let definition:
					| {
							namespace: string;
							resource: ResourceObject<unknown, unknown>;
					  }
					| undefined;

				return {
					commit() {
						if (!artifact.resource) {
							return;
						}

						definition = {
							namespace: context.namespace,
							resource: artifact.resource as ResourceObject<
								unknown,
								unknown
							>,
						};

						recordResourceDefined(definition);
						getWPKernelEventBus().emit(
							'resource:defined',
							definition
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
