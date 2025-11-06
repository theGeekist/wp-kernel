import { createHelper } from '@wpkernel/pipeline';
import { createDefaultCacheKeys } from '../../../resource/utils';
import type { CacheKeys } from '../../../resource/types';
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
 * const cacheKeysFragment = createResourceCacheKeysFragment<Post, { id: number }>();
 * pipeline.ir.use(cacheKeysFragment);
 * ```
 */
export function createResourceCacheKeysFragment<
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
			output.cacheKeys = {
				...createDefaultCacheKeys<TQuery>(context.resourceName),
				...(context.config.cacheKeys ?? {}),
			} as Required<CacheKeys<TQuery>>;
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
