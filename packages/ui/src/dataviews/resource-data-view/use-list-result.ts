import type { ListResponse } from '@wpkernel/core/resource';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import type { ListResultState, ListStatus } from './types/state';
import { useAsyncList } from './use-async-list';
import { normalizeListError } from './utils/errors';

type ResourceListHookResult<TItem> =
	| {
			data?: ListResponse<TItem>;
			isLoading?: boolean;
			error?: string;
	  }
	| undefined;

function deriveStatus<TItem>(
	data: ListResponse<TItem> | undefined,
	isLoading: boolean,
	error?: ListResultState<TItem>['error']
): ListStatus {
	if (isLoading) {
		return 'loading';
	}

	if (error) {
		return 'error';
	}

	if (data) {
		return 'success';
	}

	return 'idle';
}

/**
 * Normalize a resource-driven list hook result into ListResultState.
 * @param result
 * @param query
 * @param controller
 * @param reporter
 */
function normalizeResourceListResult<TItem, TQuery>(
	result: ResourceListHookResult<TItem>,
	query: TQuery,
	controller: ResourceDataViewController<TItem, TQuery>,
	reporter: DataViewsRuntimeContext['reporter']
): ListResultState<TItem> {
	const error = result?.error
		? normalizeListError(result.error, reporter, {
				resource: controller.resourceName,
				query,
			})
		: undefined;

	const isLoading = Boolean(result?.isLoading);
	const data = result?.data as ListResponse<TItem> | undefined;

	return {
		data,
		isLoading,
		error,
		status: deriveStatus(data, isLoading, error),
	};
}

/**
 * Derive a normalized list result for a DataView:
 * - uses `resource.useList` when available,
 * - falls back to `fetchList` + async state,
 * - normalizes and logs errors via the provided reporter.
 *
 * @param    controller
 * @param    fetchList
 * @param    query
 * @param    reporter
 * @category DataViews Hooks
 */
export function useListResult<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): ListResultState<TItem> {
	const listFromResource = controller.resource?.useList?.(query);
	const effectiveFetch = fetchList ?? controller.fetchList;
	const asyncList = useAsyncList(controller, effectiveFetch, query, reporter);

	if (effectiveFetch) {
		return asyncList;
	}

	if (listFromResource) {
		return normalizeResourceListResult(
			listFromResource,
			query,
			controller,
			reporter
		);
	}

	return asyncList;
}
