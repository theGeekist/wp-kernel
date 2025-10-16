import {
	DataViewsMock,
	createResource,
	createConfig,
	renderResourceDataView,
	flushDataViews,
} from '../test-support/ResourceDataView.test-support';

describe('ResourceDataView fetch integration', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('logs fetch errors when fetchList rejects', async () => {
		const fetchList = jest.fn().mockRejectedValue(new Error('Network'));

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		const { runtime, getDataViewProps } = renderResourceDataView({
			resource,
			config,
			props: { fetchList },
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
		const fetchList = jest.fn().mockResolvedValue({
			items: [{ id: 1 }],
			total: 1,
		});

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		const { getDataViewProps } = renderResourceDataView({
			resource,
			config,
			props: { fetchList },
		});

		await flushDataViews();

		const props = getDataViewProps();
		expect(props.data).toEqual([{ id: 1 }]);
		expect(props.paginationInfo.totalItems).toBe(1);
	});

	it('handles fetch rejections with non-error values', async () => {
		const fetchList = jest.fn().mockRejectedValue('nope');

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		const { runtime, getDataViewProps } = renderResourceDataView({
			resource,
			config,
			props: { fetchList },
		});

		await flushDataViews(2);

		const props = getDataViewProps();
		expect(props.isLoading).toBe(false);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ error: 'nope' })
		);
	});
});
