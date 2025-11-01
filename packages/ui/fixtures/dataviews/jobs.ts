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
	defaultLayouts: {
		table: { density: 'compact' },
	},
	views: [
		{
			id: 'all-jobs',
			label: 'All jobs',
			description: 'Shows every job regardless of status.',
			isDefault: true,
			view: {
				type: 'table',
				fields: ['title', 'status', 'department'],
				sort: { field: 'title', direction: 'asc' },
			} as View,
		},
		{
			id: 'published',
			label: 'Published jobs',
			description: 'Filters to roles that are currently published.',
			view: {
				type: 'table',
				fields: ['title', 'department'],
				filters: [
					{ field: 'status', value: 'published', operator: 'is' },
				],
				sort: { field: 'title', direction: 'asc' },
			} as View,
		},
	],
	screen: {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
		menu: {
			slug: 'jobs-admin',
			title: 'Jobs',
			capability: 'manage_jobs',
			position: 25,
		},
	},
};
