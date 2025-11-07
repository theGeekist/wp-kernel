import { useMemo } from 'react';
import type { ResourceObject } from '@wpkernel/core/resource';
import { useStableCallback } from './internal/useStableCallback';

/**
 * Function type for prefetching a single item by ID.
 *
 * @category Utilities
 * @public
 */
export type PrefetchGet = (id: string | number) => void;

/**
 * Function type for prefetching a list of items with optional query parameters.
 *
 * @category Utilities
 * @public
 */
export type PrefetchList<TQuery> = (query?: TQuery) => void;

/**
 * Interface for the prefetcher, which exposes stable cache prefetch helpers for a resource.
 *
 * @category Utilities
 * @public
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
 * Wraps the wpk resource's `prefetchGet` and `prefetchList` helpers so React
 * components can wire them to UI affordances (hover, visibility, etc.) without
 * re-creating callback instances on every render.
 *
 * @category Utilities
 * @public
 * @param    resource - Kernel resource exposing optional prefetch helpers.
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
