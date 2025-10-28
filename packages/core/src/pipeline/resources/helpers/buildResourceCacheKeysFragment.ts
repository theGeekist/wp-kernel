import { createHelper } from '../../helper';
import { createDefaultCacheKeys } from '../../../resource/utils';
import type { CacheKeys } from '../../../resource/types';
import type { ResourceFragmentHelper } from '../types';

export function buildResourceCacheKeysFragment<
	T,
	TQuery,
>(): ResourceFragmentHelper<T, TQuery> {
	return createHelper({
		key: 'resource.cacheKeys.build',
		kind: 'core.resource.fragment',
		dependsOn: ['resource.config.validate'],
		apply: ({ context, output }) => {
			output.cacheKeys = {
				...createDefaultCacheKeys<TQuery>(context.resourceName),
				...(context.config.cacheKeys ?? {}),
			} as Required<CacheKeys<TQuery>>;
		},
	});
}
