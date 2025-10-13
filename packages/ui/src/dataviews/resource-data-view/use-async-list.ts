import { useEffect, useState } from 'react';
import type { ListResponse } from '@geekist/wp-kernel/resource';
import type { DataViewsRuntimeContext } from '../types';

type AsyncListState<TItem> = {
	data?: ListResponse<TItem>;
	isLoading: boolean;
	error?: string;
};

export function useAsyncList<TItem, TQuery>(
	fetchList: ((query: TQuery) => Promise<ListResponse<TItem>>) | undefined,
	query: TQuery,
	reporter: DataViewsRuntimeContext['reporter']
): AsyncListState<TItem> {
	const [state, setState] = useState<AsyncListState<TItem>>({
		data: undefined,
		isLoading: Boolean(fetchList),
		error: undefined,
	});

	useEffect(() => {
		let active = true;

		if (!fetchList) {
			setState({ data: undefined, isLoading: false, error: undefined });
			return () => {
				active = false;
			};
		}

		setState((prev) => ({ ...prev, isLoading: true }));

		fetchList(query)
			.then((data) => {
				if (!active) {
					return;
				}
				setState({ data, isLoading: false, error: undefined });
			})
			.catch((error: unknown) => {
				if (!active) {
					return;
				}
				const message =
					error instanceof Error
						? error.message
						: 'Failed to fetch list data';
				reporter.error?.('Standalone DataViews fetch failed', {
					error,
					query,
				});
				setState({
					data: undefined,
					isLoading: false,
					error: message,
				});
			});

		return () => {
			active = false;
		};
	}, [fetchList, query, reporter]);

	return state;
}
