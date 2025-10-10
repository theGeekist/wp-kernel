import type { QueryMapping, ResourceDataViewConfig } from '../../src/dataviews';
import type { View } from '@wordpress/dataviews';

export interface JobItem {
	id: number;
	title: string;
	status: 'draft' | 'published';
	department?: string;
}

export interface JobQuery {
	search?: string;
	page: number;
	perPage: number;
	sortBy?: string;
	sortDir?: 'asc' | 'desc';
	filters?: Record<string, unknown>;
}

export const jobQueryMapping: QueryMapping<JobQuery> = (state) => ({
	search: state.search,
	page: state.page,
	perPage: state.perPage,
	sortBy: state.sort?.field,
	sortDir: state.sort?.direction,
	filters: state.filters,
});

export const jobDataViewConfig: ResourceDataViewConfig<JobItem, JobQuery> = {
	fields: [
		{ id: 'title', label: 'Title', enableSorting: true },
		{ id: 'status', label: 'Status', enableSorting: true },
		{ id: 'department', label: 'Department' },
	],
	defaultView: {
		type: 'table',
		fields: ['title', 'status', 'department'],
		perPage: 20,
		page: 1,
		sort: { field: 'title', direction: 'asc' },
	} as View,
	mapQuery: jobQueryMapping,
	search: true,
	searchLabel: 'Search jobs',
	perPageSizes: [10, 20, 50],
};
