import { useEffect } from 'react';
import type { ResourceObject } from '@wpkernel/core/resource';
import { useStableCallback } from './internal/useStableCallback';
import { usePrefetcher } from './usePrefetcher';

/**
 * Options for the useNextPagePrefetch hook.
 *
 * @category Prefetching
 * @public
 */
export interface NextPagePrefetchOptions<TQuery> {
	/**
	 * A function that computes the next query to prefetch.
	 *
	 * @param query - The current query.
	 * @returns The next query to prefetch.
	 */
	computeNext?: (query: TQuery) => TQuery;
	/**
	 * If true, the prefetch will be triggered.
	 *
	 * @default true
	 */
	when?: boolean;
}

const defaultComputeNext = <TQuery extends Record<string, unknown>>(
	query: TQuery
): TQuery => {
	const currentPage = Number(query?.page ?? 1);
	return {
		...query,
		page: Number.isFinite(currentPage) ? currentPage + 1 : 2,
	};
};

/**
 * Prefetches the next page of a paginated resource.
 *
 * @category Prefetching
 * @param    resource     - The resource to prefetch.
 * @param    currentQuery - The current query.
 * @param    options      - Options for the hook.
 */
export function useNextPagePrefetch<
	TRecord,
	TQuery extends Record<string, unknown>,
>(
	resource: ResourceObject<TRecord, TQuery>,
	currentQuery: TQuery,
	options: NextPagePrefetchOptions<TQuery> = {}
): void {
	const { prefetchList } = usePrefetcher(resource);
	const computeNext = useStableCallback(
		options.computeNext ?? defaultComputeNext<TQuery>
	);
	const shouldRun = options.when ?? true;

	useEffect(() => {
		if (!shouldRun) {
			return;
		}

		const nextQuery = computeNext(currentQuery);
		if (!nextQuery) {
			return;
		}
		prefetchList(nextQuery);
	}, [computeNext, currentQuery, prefetchList, shouldRun]);
}
