import { createHelper } from '../../helper';
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
			output.cacheKeys = {
				...createDefaultCacheKeys<TQuery>(context.resourceName),
				...(context.config.cacheKeys ?? {}),
			} as Required<CacheKeys<TQuery>>;
		},
	}) satisfies ResourceFragmentHelper<T, TQuery>;
}
