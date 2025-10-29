import { createHelper } from '../../helper';
import { createDefaultCacheKeys } from '../../../resource/utils';
import type { CacheKeys } from '../../../resource/types';
import { WPKernelError } from '../../../error/WPKernelError';
import type {
	ResourceFragmentHelper,
	ResourceFragmentInput,
	ResourceFragmentKind,
	ResourcePipelineContext,
	ResourcePipelineDraft,
} from '../types';
import { RESOURCE_FRAGMENT_KIND } from '../types';
import type { Reporter } from '../../../reporter/types';

/**
 * Create a fragment helper that merges user-defined cache keys with the
 * framework defaults to guarantee a complete cache key surface.
 *
 * @example
 * ```ts
 * const cacheKeysFragment = buildResourceCacheKeysFragment<Post, { id: number }>();
 * pipeline.ir.use(cacheKeysFragment);
 * ```
 */
export function buildResourceCacheKeysFragment<
	T,
	TQuery,
>(): ResourceFragmentHelper<T, TQuery> {
	return createHelper<
		ResourcePipelineContext<T, TQuery>,
		ResourceFragmentInput<T, TQuery>,
		ResourcePipelineDraft<T, TQuery>,
		Reporter,
		ResourceFragmentKind
	>({
		key: 'resource.cacheKeys.build',
		kind: RESOURCE_FRAGMENT_KIND,
		dependsOn: ['resource.config.validate'],
		apply: ({ context, output }) => {
			const resourceName = output.resourceName ?? context.resourceName;

			if (!resourceName) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Resource cache key creation requires a resource name. Ensure resource.namespace.resolve runs first.',
				});
			}

			const overrideCacheKeys: Partial<CacheKeys<TQuery>> =
				context.config.cacheKeys ?? {};
			const cacheKeys = {
				...createDefaultCacheKeys<TQuery>(resourceName),
				...overrideCacheKeys,
			} satisfies Required<CacheKeys<TQuery>>;

			output.cacheKeys = cacheKeys;
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
