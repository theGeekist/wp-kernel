import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import type { DataViews } from '@wordpress/dataviews';
import { computeTotalPages } from '../utils/pagination';

type DataViewsComponent = typeof DataViews;

export function usePaginationInfo(totalItems: number, perPage: number) {
	return useMemo<ComponentProps<DataViewsComponent>['paginationInfo']>(() => {
		return {
			totalItems,
			totalPages: computeTotalPages(totalItems, perPage),
		};
	}, [perPage, totalItems]);
}
