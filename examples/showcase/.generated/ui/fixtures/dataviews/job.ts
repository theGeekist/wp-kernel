import type { ResourceDataViewConfig } from '@wpkernel/ui/dataviews';

export const jobDataViewConfig: ResourceDataViewConfig<unknown, unknown> = {
	fields: [
		{
			id: 'title',
			label: 'Title',
			type: 'text',
			enableSorting: true,
			enableGlobalSearch: true,
			isValid: {
				required: true,
			},
		},
		{
			id: 'department',
			label: 'Department',
			type: 'text',
			enableGlobalSearch: true,
		},
		{
			id: 'location',
			label: 'Location',
			type: 'text',
			enableGlobalSearch: true,
		},
		{
			id: 'status',
			label: 'Status',
			type: 'text',
			elements: [
				{
					value: 'draft',
					label: 'Draft',
				},
				{
					value: 'publish',
					label: 'Published',
				},
				{
					value: 'closed',
					label: 'Closed',
				},
			],
			filterBy: {
				operators: ['isAny'],
			},
			isValid: {
				required: true,
			},
			getValue: ({ item }) =>
				jobStatusLabels[item.status ?? 'draft'] ?? item.status ?? '',
		},
		{
			id: 'description',
			label: 'Description',
			type: 'text',
			Edit: {
				control: 'textarea',
				rows: 6,
			},
		},
		{
			id: 'updated_at',
			label: 'Updated',
			type: 'datetime',
			enableSorting: true,
			getValue: ({ item }) => {
				const timestamp = item.updated_at ?? item.created_at;
				if (!timestamp) {
					return '';
				}
				const parsed = new Date(timestamp);
				return Number.isNaN(parsed.getTime())
					? timestamp
					: parsed.toLocaleDateString();
			},
		},
	],
	defaultView: {
		type: 'table',
		fields: ['title', 'department', 'location', 'status', 'updated_at'],
		perPage: 10,
		page: 1,
		sort: {
			field: 'updated_at',
			direction: 'desc',
		},
	},
	mapQuery: (viewState) => {
		const state = viewState;
		const params = {
			cursor: String(state.page ?? 1),
			per_page: state.perPage ?? 10,
		};
		const search = toTrimmedString(state.search);
		if (search) {
			params.q = search;
		}
		const filters = state.filters ?? {};
		const status = resolveStatus(filters.status);
		if (status) {
			params.status = status;
		}
		assignStringFilter(params, 'department', filters.department);
		assignStringFilter(params, 'location', filters.location);
		return params;
	},
	search: true,
	searchLabel: 'Search jobs',
	perPageSizes: [10, 20, 50],
	screen: {
		component: 'JobsAdminScreen',
		route: '/admin.php?page=wpk-jobs',
		menu: {
			slug: 'wpk-jobs',
			title: 'Jobs',
			capability: 'manage_options',
		},
	},
};
