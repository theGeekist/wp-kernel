import { useEffect, useState } from 'react';
import type { ListResponse } from '@wpkernel/core/resource';
import type { DataViewsRuntimeContext } from '../types';
import type { ListResultState } from './types/state';
import { normalizeListError } from './utils/errors';

export function useAsyncList<TItem, TQuery>(
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter'],
	resourceName: string
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
					resource: resourceName,
					query,
				});
				setState({
					data: undefined,
					status: 'error',
					isLoading: false,
					error: normalized,
				});
			});

		return () => {
			active = false;
		};
	}, [fetchList, query, reporter]);

	return state;
}
