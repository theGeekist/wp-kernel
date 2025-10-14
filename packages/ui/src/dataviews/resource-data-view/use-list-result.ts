import type { ListResponse } from '@wpkernel/core/resource';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import { useAsyncList } from './use-async-list';

export function useListResult<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): { data?: ListResponse<TItem>; isLoading?: boolean } {
	const listFromResource = controller.resource?.useList?.(query);
	const effectiveFetch = fetchList ?? controller.fetchList;
	const asyncList = useAsyncList(effectiveFetch, query, reporter);
	if (effectiveFetch) {
		return asyncList as {
			data?: ListResponse<TItem>;
			isLoading?: boolean;
		};
	}
	return (listFromResource ?? asyncList) as {
		data?: ListResponse<TItem>;
		isLoading?: boolean;
	};
}
