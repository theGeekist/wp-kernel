import {
	DataViewsMock,
	createKernelRuntime,
	renderWithProvider,
	createResource,
	createConfig,
	getLastDataViewsProps,
} from '../test-support/ResourceDataView.test-support';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ResourceDataView } from '../ResourceDataView';
import { createDataViewsRuntime } from '../runtime';

describe('ResourceDataView runtime integration', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('maps view changes through query mapping', () => {
		const runtime = createKernelRuntime();
		const useList = jest.fn(() => ({
			data: { items: [], total: 0 },
			isLoading: false,
			error: undefined,
		}));

		const resource = createResource<{ id: number }, { search?: string }>({
			useList,
			prefetchList: jest.fn(),
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		expect(useList).toHaveBeenCalledWith({ search: undefined });

		const props = getLastDataViewsProps();
		act(() => {
			props.onChangeView({
				...config.defaultView,
				search: 'engineer',
			});
		});

		expect(useList).toHaveBeenLastCalledWith({ search: 'engineer' });
	});

	it('renders with a standalone DataViews runtime when provided via props', () => {
		const preferences = new Map<string, unknown>();
		const standaloneRuntime = createDataViewsRuntime({
			namespace: 'standalone-tests',
			reporter: createKernelRuntime().reporter,
			preferences: {
				get: async (key: string) => preferences.get(key),
				set: async (key: string, value: unknown) => {
					preferences.set(key, value);
				},
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			emit: jest.fn(),
			invalidate: jest.fn(),
		});

		const useList = jest.fn(() => ({
			data: { items: [], total: 0 },
			isLoading: false,
			error: undefined,
		}));

		const resource = createResource<{ id: number }, { search?: string }>({
			useList,
			prefetchList: jest.fn(),
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		const container = document.createElement('div');
		const root = createRoot(container);

		expect(() =>
			act(() => {
				root.render(
					<ResourceDataView
						resource={resource}
						config={config}
						runtime={standaloneRuntime}
					/>
				);
			})
		).not.toThrow();

		expect(DataViewsMock).toHaveBeenCalled();
		expect(useList).toHaveBeenCalledWith({ search: undefined });

		act(() => {
			root.unmount();
		});
	});

	it('exposes wrapper metadata for E2E helpers', () => {
		const runtime = createKernelRuntime();
		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [], total: 0 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({});

		const { container } = renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const wrapper = container.querySelector('[data-wpk-dataview="jobs"]');
		expect(wrapper).toBeTruthy();
		const element = wrapper as HTMLElement;
		expect(element.getAttribute('data-wpk-dataview-namespace')).toBe(
			'tests'
		);
		expect(element.getAttribute('data-wpk-dataview-loading')).toBe('false');
	});

	it('merges default layouts and honours search configuration', () => {
		const runtime = createKernelRuntime();
		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
				layout: { columns: 2 } as Record<string, unknown>,
			},
			defaultLayouts: {
				table: { density: 'compact' },
			},
			search: false,
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = getLastDataViewsProps();
		expect(props.defaultLayouts).toEqual({ table: { density: 'compact' } });
		expect(props.search).toBe(false);
	});
});
