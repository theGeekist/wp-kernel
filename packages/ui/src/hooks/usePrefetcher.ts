import { useMemo } from 'react';
import type { ResourceObject } from '@wpkernel/core/resource';
import { useStableCallback } from './internal/useStableCallback';

type PrefetchGet = (id: string | number) => void;
type PrefetchList<TQuery> = (query?: TQuery) => void;

/**
 * Interface for the prefetcher, which exposes stable cache prefetch helpers for a resource.
 *
 * @category Prefetching
 */
export interface Prefetcher<TQuery = unknown> {
	/**
	 * Prefetches a single item from the resource.
	 */
	prefetchGet: PrefetchGet;
	/**
	 * Prefetches a list of items from the resource.
	 */
	prefetchList: PrefetchList<TQuery>;
}

/**
 * Exposes stable cache prefetch helpers for a resource.
 *
 * Wraps the kernel resource's `prefetchGet` and `prefetchList` helpers so React
 * components can wire them to UI affordances (hover, visibility, etc.) without
 * re-creating callback instances on every render.
 * @param resource
 */
export function usePrefetcher<TRecord, TQuery = unknown>(
	resource: ResourceObject<TRecord, TQuery>
): Prefetcher<TQuery> {
	const prefetchGet = useStableCallback<PrefetchGet>((id) => {
		if (resource.prefetchGet) {
			void resource.prefetchGet(id);
		}
	});

	const prefetchList = useStableCallback<PrefetchList<TQuery>>((query) => {
		if (resource.prefetchList) {
			void resource.prefetchList(query);
		}
	});

	return useMemo(
		() => ({
			prefetchGet,
			prefetchList,
		}),
		[prefetchGet, prefetchList]
	);
}
