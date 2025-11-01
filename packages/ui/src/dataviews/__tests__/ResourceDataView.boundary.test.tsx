import {
	DataViewsMock,
	renderResourceDataView,
	createKernelRuntime,
	buildListResource,
	flushDataViews,
	createConfig,
} from '../test-support/ResourceDataView.test-support';
import { listLoadFailedMessage } from '../resource-data-view/i18n';

describe('ResourceDataView boundaries', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('renders a loading boundary while list data is pending', () => {
		const resource = buildListResource([], {
			useList: jest.fn(() => ({
				data: undefined,
				isLoading: true,
				error: undefined,
			})),
		});

		const { renderResult } = renderResourceDataView({
			resource,
		});

		expect(
			renderResult.getByText('Loading…', { selector: 'p' })
		).toBeTruthy();
		expect(DataViewsMock).not.toHaveBeenCalled();
	});

	it('renders the provided empty state when no items are available', async () => {
		const resource = buildListResource([], {
			useList: jest.fn(() => ({
				data: { items: [], total: 0 },
				isLoading: false,
				error: undefined,
			})),
		});

		const { renderResult } = renderResourceDataView({
			resource,
			props: {
				emptyState: <span>Nothing here yet</span>,
			},
		});

		await flushDataViews();

		expect(
			renderResult.getByText('Nothing here yet', { selector: 'span' })
		).toBeTruthy();
		expect(DataViewsMock).not.toHaveBeenCalled();
	});

	it('renders an error boundary when the list result includes an error', async () => {
		const resource = buildListResource([], {
			useList: jest.fn(() => ({
				data: undefined,
				isLoading: false,
				error: 'Boom',
			})),
		});

		const { renderResult, runtime } = renderResourceDataView({
			resource,
		});

		await flushDataViews();

		const alert = renderResult.getByRole('alert');
		expect(alert.textContent).toContain(listLoadFailedMessage);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'DataViews list fetch failed',
			expect.objectContaining({ resource: 'jobs' })
		);
	});

	it('renders a permission denied boundary when capability checks fail', async () => {
		const runtime = createKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn().mockResolvedValue(false),
			},
		} as typeof runtime.capabilities;

		const { renderResult } = renderResourceDataView({
			runtime,
			config: createConfig({
				screen: {
					menu: {
						slug: 'jobs-admin',
						title: 'Jobs',
						label: 'Jobs',
						capability: 'jobs.view',
					},
				},
			}),
		});

		await flushDataViews();

		expect(
			renderResult.getByText(
				'You do not have permission to view this screen.',
				{ selector: 'p' }
			)
		).toBeTruthy();
		expect(
			renderResult.getByText('Required capability:', { selector: 'p' })
		).toBeTruthy();
		expect(
			renderResult.getByText('jobs.view', { selector: 'code' })
		).toBeTruthy();
		expect(DataViewsMock).not.toHaveBeenCalled();
	});
});
