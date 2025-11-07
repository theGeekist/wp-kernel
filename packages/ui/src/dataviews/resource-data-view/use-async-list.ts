import { useEffect, useState } from 'react';
import type { ListResponse } from '@wpkernel/core/resource';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import type { ListResultState } from './types/state';
import { normalizeListError } from './utils/errors';

/**
 * Async list loader for DataViews controllers.
 *
 * When `fetchList` is provided, manages:
 * - loading state,
 * - success state,
 * - normalized error state via `normalizeListError`,
 * - `emitFetchFailed` side effect on failure.
 *
 * When `fetchList` is absent, yields an idle state.
 * @param    controller
 * @param    fetchList
 * @param    query
 * @param    reporter
 * @category DataViews Hooks
 */
export function useAsyncList<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): ListResultState<TItem> {
	const [state, setState] = useState<ListResultState<TItem>>({
		data: undefined,
		status: fetchList ? 'loading' : 'idle',
		isLoading: Boolean(fetchList),
		error: undefined,
	});

	useEffect(() => {
		let active = true;

		if (!fetchList) {
			setState({
				data: undefined,
				status: 'idle',
				isLoading: false,
				error: undefined,
			});
			return () => {
				active = false;
			};
		}

		setState((prev) => ({
			...prev,
			status: 'loading',
			isLoading: true,
			error: undefined,
		}));

		fetchList(query)
			.then((data) => {
				if (!active) {
					return;
				}
				setState({
					data,
					status: 'success',
					isLoading: false,
					error: undefined,
				});
			})
			.catch((error: unknown) => {
				if (!active) {
					return;
				}
				const normalized = normalizeListError(error, reporter, {
					resource: controller.resourceName,
					query,
				});
				setState({
					data: undefined,
					status: 'error',
					isLoading: false,
					error: normalized,
				});
				controller.emitFetchFailed({
					error: normalized,
					query,
				});
			});

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchList, query, reporter]);

	return state;
}
