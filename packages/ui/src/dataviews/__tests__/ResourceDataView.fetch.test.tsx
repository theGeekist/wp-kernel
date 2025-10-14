import {
	DataViewsMock,
	createKernelRuntime,
	renderWithProvider,
	createResource,
	createConfig,
	getLastDataViewsProps,
} from '../test-support/ResourceDataView.test-support';
import { act } from 'react';
import { ResourceDataView } from '../ResourceDataView';

describe('ResourceDataView fetch integration', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('logs fetch errors when fetchList rejects', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockRejectedValue(new Error('Network'));

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		renderWithProvider(
			<ResourceDataView
				resource={resource}
				config={config}
				fetchList={fetchList}
			/>,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.isLoading).toBe(false);
		expect(props.data).toEqual([]);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ query: expect.any(Object) })
		);
	});

	it('renders fetchList results when resource has no list hook', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockResolvedValue({
			items: [{ id: 1 }],
			total: 1,
		});

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		renderWithProvider(
			<ResourceDataView
				resource={resource}
				config={config}
				fetchList={fetchList}
			/>,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.data).toEqual([{ id: 1 }]);
		expect(props.paginationInfo.totalItems).toBe(1);
	});

	it('handles fetch rejections with non-error values', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockRejectedValue('nope');

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: undefined,
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		renderWithProvider(
			<ResourceDataView
				resource={resource}
				config={config}
				fetchList={fetchList}
			/>,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.isLoading).toBe(false);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ error: 'nope' })
		);
	});
});
