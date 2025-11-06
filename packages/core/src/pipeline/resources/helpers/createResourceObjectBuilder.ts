import { createHelper } from '@wpkernel/pipeline';
import { buildResourceObject } from '../../../resource/buildResourceObject';
import type {
	ResourceBuilderHelper,
	ResourceBuilderInput,
	ResourceBuilderKind,
	ResourcePipelineArtifact,
	ResourcePipelineContext,
} from '../types';
import { RESOURCE_BUILDER_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';
import { WPKernelError } from '../../../error/WPKernelError';

/**
 * Create the builder helper that assembles the final resource object once
 * prerequisite fragments (client and cache keys) have executed.
 *
 * @example
 * ```ts
 * const builder = createResourceObjectBuilder<Post, { id: number }>();
 * pipeline.builders.use(builder);
 * ```
 */
export function createResourceObjectBuilder<T, TQuery>(): ResourceBuilderHelper<
	T,
	TQuery
> {
	return createHelper<
		ResourcePipelineContext<T, TQuery>,
		ResourceBuilderInput<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>,
		Reporter,
		ResourceBuilderKind
	>({
		key: 'resource.object.build',
		kind: RESOURCE_BUILDER_KIND,
		apply: ({ context, output }) => {
			if (!output.client) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource pipeline executed without a client instance. Ensure resource.client.build runs first.',
				});
			}

			if (!output.cacheKeys) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource pipeline executed without cache keys. Ensure resource.cacheKeys.build runs first.',
				});
			}

			output.resource = buildResourceObject({
				config: context.config,
				normalizedConfig: context.normalizedConfig,
				namespace: context.namespace,
				resourceName: context.resourceName,
				reporter: context.reporter,
				cacheKeys: output.cacheKeys,
				client: output.client,
			});
		},
	}) satisfies ResourceBuilderHelper<T, TQuery>;
}
