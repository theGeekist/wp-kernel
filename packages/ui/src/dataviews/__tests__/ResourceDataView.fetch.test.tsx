import {
	DataViewsMock,
	createResource,
	createConfig,
	renderResourceDataView,
	flushDataViews,
	createDataViewsTestController,
	createKernelRuntime,
	type ResourceDataViewTestProps,
	type RuntimeWithDataViews,
} from '../test-support/ResourceDataView.test-support';
import type {
	ResourceDataViewConfig,
	ResourceDataViewController,
} from '../types';

type Item = { id: number };

type Query = { search?: string; page?: number; perPage?: number };

type FetchScenarioOptions = {
	fetchList?: jest.Mock;
	configOverrides?: Parameters<typeof createConfig<Item, Query>>[0];
	props?: Partial<ResourceDataViewTestProps<Item, Query>>;
	resourceOverrides?: Parameters<typeof createResource<Item, Query>>[0];
};

function renderStandaloneFetchScenario(options: FetchScenarioOptions = {}) {
	const {
		fetchList = jest.fn(),
		configOverrides,
		props,
		resourceOverrides,
	} = options;

	return {
		...renderResourceDataView<Item, Query>({
			resource: createResource<Item, Query>({
				useList: undefined,
				...(resourceOverrides ?? {}),
			}),
			config: createConfig<Item, Query>({
				...(configOverrides ?? {}),
			}),
			props: { fetchList, ...(props ?? {}) },
		}),
		fetchList,
	};
}

function createRawPerPageController(
	runtime: RuntimeWithDataViews,
	config: ResourceDataViewConfig<Item, Query>
): ResourceDataViewController<Item, Query> {
	const mapViewToQuery: ResourceDataViewController<
		Item,
		Query
	>['mapViewToQuery'] = (view) =>
		({
			page: view.page as number | undefined,
			perPage: view.perPage as number | undefined,
		}) as Query;

	const queryMapping: ResourceDataViewController<
		Item,
		Query
	>['queryMapping'] = (state) =>
		({
			page: state.page,
			perPage: state.perPage as unknown as number | undefined,
		}) as Query;

	const deriveViewState: ResourceDataViewController<
		Item,
		Query
	>['deriveViewState'] = (view) => {
		const perPage = view.perPage as number | undefined;
		return {
			fields: (view.fields ??
				config.defaultView.fields ??
				[]) as string[],
			sort: view.sort,
			search: view.search,
			filters: undefined,
			page:
				typeof view.page === 'number' && view.page > 0 ? view.page : 1,
			perPage: perPage as unknown as number,
		};
	};

	return {
		resource: undefined,
		resourceName: 'items',
		config,
		queryMapping,
		runtime: runtime.dataviews,
		namespace: runtime.namespace,
		preferencesKey: 'tests::items',
		invalidate: runtime.invalidate,
		capabilities: undefined,
		fetchList: undefined,
		prefetchList: undefined,
		mapViewToQuery,
		deriveViewState,
		loadStoredView: jest.fn().mockResolvedValue(undefined),
		saveView: jest.fn().mockResolvedValue(undefined),
		emitViewChange: jest.fn(),
		emitRegistered: jest.fn(),
		emitUnregistered: jest.fn(),
		emitAction: jest.fn(),
		getReporter: jest.fn(() => runtime.reporter),
	};
}

describe('ResourceDataView fetch integration', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('logs fetch errors when fetchList rejects', async () => {
		const { runtime, getDataViewProps } = renderStandaloneFetchScenario({
			fetchList: jest.fn().mockRejectedValue(new Error('Network')),
		});

		await flushDataViews(2);

		const props = getDataViewProps();
		expect(props.isLoading).toBe(false);
		expect(props.data).toEqual([]);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ query: expect.any(Object) })
		);
	});

	it('renders fetchList results when resource has no list hook', async () => {
		const { getDataViewProps } = renderStandaloneFetchScenario({
			fetchList: jest.fn().mockResolvedValue({
				items: [{ id: 1 }],
				total: 1,
			}),
		});

		await flushDataViews();

		const props = getDataViewProps();
		expect(props.data).toEqual([{ id: 1 }]);
		expect(props.paginationInfo.totalItems).toBe(1);
	});

	it('handles fetch rejections with non-error values', async () => {
		const { runtime, getDataViewProps } = renderStandaloneFetchScenario({
			fetchList: jest.fn().mockRejectedValue('nope'),
		});

		await flushDataViews(2);

		const props = getDataViewProps();
		expect(props.isLoading).toBe(false);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ error: 'nope' })
		);
	});

	it('re-fetches paginated results when the view changes pages', async () => {
		const firstPage = Array.from({ length: 5 }, (_, index) => ({
			id: index + 1,
		}));
		const fetchList = jest.fn(async ({ page }: Query) => {
			if (!page || page === 1) {
				return {
					items: firstPage,
					total: 12,
				};
			}
			return {
				items: [{ id: 6 }],
				total: 12,
			};
		});

		const scenario = renderStandaloneFetchScenario({
			fetchList,
			configOverrides: {
				defaultView: {
					type: 'table',
					fields: ['title'],
					perPage: 5,
					page: 1,
				},
				mapQuery: ({ page, perPage }) => ({
					page,
					perPage,
				}),
			},
		});

		const controller = createDataViewsTestController(scenario);

		await flushDataViews(2);

		expect(fetchList).toHaveBeenNthCalledWith(1, {
			page: 1,
			perPage: 5,
		});

		let props = controller.getProps();
		expect(props.paginationInfo.totalPages).toBe(3);

		controller.updateView((view) => ({ ...view, page: 2 }));

		await flushDataViews(2);

		expect(fetchList.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(fetchList).toHaveBeenLastCalledWith({ page: 2, perPage: 5 });

		props = controller.getProps();
		expect(props.view.page).toBe(2);
		expect(props.data).toEqual([{ id: 6 }]);
	});

	it('falls back to a single page when perPage is zero or undefined', async () => {
		const fetchList = jest
			.fn<Promise<{ items: Item[]; total: number }>, [Query]>()
			.mockResolvedValue({
				items: [{ id: 1 }],
				total: 25,
			});

		const runtime = createKernelRuntime();
		const config = createConfig<Item, Query>({
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 0,
				page: 1,
			},
			mapQuery: ({ page, perPage }) => ({
				page,
				perPage,
			}),
		});

		const view = renderResourceDataView<Item, Query>({
			runtime,
			config,
			props: {
				controller: createRawPerPageController(runtime, config),
				fetchList,
			},
		});

		const controller = createDataViewsTestController(view);

		await flushDataViews(2);

		expect(fetchList).toHaveBeenNthCalledWith(1, {
			page: 1,
			perPage: 0,
		});

		let props = controller.getProps();
		expect(props.paginationInfo.totalItems).toBe(25);
		expect(props.paginationInfo.totalPages).toBe(1);
		expect(props.view.perPage).toBe(0);

		controller.updateView((viewState) => ({
			...viewState,
			page: 2,
			perPage: undefined,
		}));

		await flushDataViews(2);

		expect(fetchList).toHaveBeenLastCalledWith({
			page: 2,
			perPage: undefined,
		});

		props = controller.getProps();
		expect(props.view.page).toBe(2);
		expect(props.paginationInfo.totalPages).toBe(1);
		expect(props.paginationInfo.totalItems).toBe(25);
	});
});
