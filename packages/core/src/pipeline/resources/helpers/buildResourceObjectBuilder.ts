import { createHelper } from '../../helper';
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
 * const builder = buildResourceObjectBuilder<Post, { id: number }>();
 * pipeline.builders.use(builder);
 * ```
 */
export function buildResourceObjectBuilder<T, TQuery>(): ResourceBuilderHelper<
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
			const normalizedConfig = context.normalizedConfig;
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

			if (!normalizedConfig) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource object construction requires a normalized config. Ensure resource.namespace.resolve runs first.',
				});
			}

			const namespace = output.namespace ?? context.namespace;
			const resourceName = output.resourceName ?? context.resourceName;

			if (!namespace || !resourceName) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource object construction requires namespace and resource name metadata. Ensure resource.namespace.resolve runs first.',
				});
			}

			output.resource = buildResourceObject({
				config: context.config,
				normalizedConfig,
				namespace,
				resourceName,
				reporter: context.reporter,
				cacheKeys: output.cacheKeys,
				client: output.client,
				storeKey: output.storeKey,
				groupedApi: output.groupedApi,
			});
		},
	}) satisfies ResourceBuilderHelper<T, TQuery>;
}
