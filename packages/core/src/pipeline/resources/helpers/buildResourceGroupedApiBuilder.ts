import { createHelper } from '../../helper';
import {
	createCacheGetter,
	createEventsGetter,
	createGetGetter,
	createMutateGetter,
	createSelectGetter,
	createStoreApiGetter,
	type ResourceGroupedApiGetters,
} from '../../../resource/grouped-api';
import { WPKernelError } from '../../../error/WPKernelError';
import type {
	ResourceBuilderHelper,
	ResourceBuilderInput,
	ResourceBuilderKind,
	ResourcePipelineArtifact,
	ResourcePipelineContext,
} from '../types';
import { RESOURCE_BUILDER_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';

export function buildResourceGroupedApiBuilder<
	T,
	TQuery,
>(): ResourceBuilderHelper<T, TQuery> {
	return createHelper<
		ResourcePipelineContext<T, TQuery>,
		ResourceBuilderInput<T, TQuery>,
		ResourcePipelineArtifact<T, TQuery>,
		Reporter,
		ResourceBuilderKind
	>({
		key: 'resource.groupedApi.assemble',
		kind: RESOURCE_BUILDER_KIND,
		apply: ({ context, output }) => {
			const namespace = output.namespace ?? context.namespace;
			const resourceName = output.resourceName ?? context.resourceName;
			const cacheKeys = output.cacheKeys;
			const normalizedConfig = context.normalizedConfig;

			if (!cacheKeys) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource grouped API assembly requires cache keys. Ensure resource.cacheKeys.build runs first.',
				});
			}

			if (!normalizedConfig) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource grouped API assembly requires a normalized config. Ensure resource.namespace.resolve runs first.',
				});
			}

			const groupedApi: ResourceGroupedApiGetters<T, TQuery> = {
				select: createSelectGetter<T, TQuery>(context.config),
				get: createGetGetter<T, TQuery>(context.config),
				mutate: createMutateGetter<T, TQuery>(context.config),
				cache: createCacheGetter<T, TQuery>(
					normalizedConfig,
					cacheKeys
				),
				storeApi: createStoreApiGetter<T, TQuery>(),
				events: createEventsGetter<T, TQuery>({
					...context.config,
					namespace,
					name: resourceName,
				}),
			};

			output.groupedApi = groupedApi;
			output.namespace = namespace;
			output.resourceName = resourceName;
			if (namespace && resourceName) {
				output.storeKey =
					output.storeKey ?? `${namespace}/${resourceName}`;
			}
		},
	}) satisfies ResourceBuilderHelper<T, TQuery>;
}
