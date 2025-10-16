import {
	DataViewsMock,
	createResource,
	createConfig,
	renderResourceDataView,
	flushDataViews,
	createDataViewsTestController,
	type ResourceDataViewTestProps,
} from '../test-support/ResourceDataView.test-support';

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
});
