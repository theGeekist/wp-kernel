import { useMemo } from 'react';
import type { View } from '@wordpress/dataviews';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ListResponse } from '@wpkernel/core/resource';
import type { ResourceDataViewController } from '../../types';
import { useListResult } from '../use-list-result';

type FetchList<TItem, TQuery> =
	| ((query: TQuery) => Promise<ListResponse<TItem>>)
	| undefined;

interface UseListStateArgs<TItem, TQuery> {
	controller: ResourceDataViewController<TItem, TQuery>;
	view: View;
	fetchList: FetchList<TItem, TQuery>;
	reporter: Reporter;
}

export function useListState<TItem, TQuery>({
	controller,
	view,
	fetchList,
	reporter,
}: UseListStateArgs<TItem, TQuery>) {
	const query = useMemo(
		() => controller.mapViewToQuery(view),
		[controller, view]
	);
	const listResult = useListResult(controller, fetchList, query, reporter);
	const items = listResult.data?.items ?? [];
	const totalItems = listResult.data?.total ?? items.length;

	return {
		query,
		listResult,
		items,
		totalItems,
	};
}
