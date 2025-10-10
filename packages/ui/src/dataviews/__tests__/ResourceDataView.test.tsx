import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DataViews, type View } from '@wordpress/dataviews';
import { KernelUIProvider } from '../../runtime/context';
import type { KernelUIRuntime } from '@geekist/wp-kernel/data';
import type { DefinedAction } from '@geekist/wp-kernel/actions';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import { ResourceDataView } from '../ResourceDataView';
import { createDataViewsRuntime } from '../runtime';
import type { ResourceDataViewConfig } from '../types';

defineGlobalAct();

jest.mock('@wordpress/dataviews', () => {
	const mockComponent = jest.fn(() => null);
	return {
		__esModule: true,
		DataViews: mockComponent,
	};
});

const DataViewsMock = DataViews as unknown as jest.Mock;

function defineGlobalAct() {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
}

function createReporter(): Reporter {
	const reporter = {
		debug: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		child: jest.fn(),
	} as unknown as jest.Mocked<Reporter>;
	reporter.child.mockReturnValue(reporter);
	return reporter;
}

type RuntimeWithDataViews = KernelUIRuntime & {
	dataviews: NonNullable<KernelUIRuntime['dataviews']>;
};

function createKernelRuntime(): RuntimeWithDataViews {
	const reporter = createReporter();
	const preferences = new Map<string, unknown>();
	const runtime: RuntimeWithDataViews = {
		kernel: undefined,
		namespace: 'tests',
		reporter,
		registry: undefined,
		events: {} as never,
		policies: undefined,
		invalidate: jest.fn(),
		options: {},
		dataviews: {
			registry: new Map(),
			controllers: new Map(),
			preferences: {
				adapter: {
					get: async (key: string) => preferences.get(key),
					set: async (key: string, value: unknown) => {
						preferences.set(key, value);
					},
				},
				get: async (key: string) => preferences.get(key),
				set: async (key: string, value: unknown) => {
					preferences.set(key, value);
				},
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
			},
			reporter,
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(() => reporter),
		},
	} as unknown as RuntimeWithDataViews;
	return runtime;
}

function renderWithProvider(ui: React.ReactElement, runtime: KernelUIRuntime) {
	const container = document.createElement('div');
	const root = createRoot(container);
	act(() => {
		root.render(
			<KernelUIProvider runtime={runtime}>{ui}</KernelUIProvider>
		);
	});
	return {
		root,
		container,
	};
}

describe('ResourceDataView', () => {
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

		const resource = {
			name: 'jobs',
			useList,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		expect(useList).toHaveBeenCalledWith({ search: undefined });

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props).toBeDefined();
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
			reporter: createReporter(),
			preferences: {
				get: async (key: string) => preferences.get(key),
				set: async (key: string, value: unknown) => {
					preferences.set(key, value);
				},
			},
		});

		const useList = jest.fn(() => ({
			data: { items: [], total: 0 },
			isLoading: false,
			error: undefined,
		}));

		const resource = {
			name: 'jobs',
			useList,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
				search: undefined,
			} as View,
			mapQuery: () => ({ search: undefined }),
		};

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

	it('executes actions and invalidates caches', async () => {
		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const deleteAction = Object.assign(actionImpl, {
			actionName: 'jobs.delete',
			options: { scope: 'crossTab' as const, bridged: true as const },
		}) as DefinedAction<unknown, unknown>;

		const resourceInvalidate = jest.fn();
		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }, { id: 2 }], total: 2 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: resourceInvalidate,
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: deleteAction,
					label: 'Delete',
					supportsBulk: true,
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions).toHaveLength(1);

		await act(async () => {
			await props.actions[0].callback([{ id: 1 }, { id: 2 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(actionImpl).toHaveBeenCalledWith({ selection: ['1', '2'] });
		expect(runtime.invalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(resourceInvalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: true,
			})
		);
	});

	it('disables actions when policies deny access', async () => {
		const runtime = createKernelRuntime();
		const policyCan = jest.fn().mockResolvedValue(false);
		runtime.policies = {
			policy: {
				can: policyCan,
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.delete',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions).toHaveLength(1);
		expect(props.actions?.[0]?.disabled).toBe(true);
		expect(policyCan).toHaveBeenCalledWith('jobs.delete');
	});

	it('omits denied actions when disabledWhenDenied is false', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.delete',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions).toEqual([]);
	});

	it('logs fetch errors when fetchList rejects', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockRejectedValue(new Error('Network'));

		const resource = {
			name: 'jobs',
			useList: undefined,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

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

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.isLoading).toBe(false);
		expect(props.data).toEqual([]);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ query: expect.any(Object) })
		);
	});

	it('warns when policy evaluation promise rejects', async () => {
		const runtime = createKernelRuntime();
		const warnSpy = runtime.dataviews.reporter.warn as jest.Mock;
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.delete',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions?.[0]?.disabled).toBe(true);
		expect(warnSpy).toHaveBeenCalledWith(
			'Policy evaluation failed for DataViews action',
			expect.objectContaining({ policy: 'jobs.delete' })
		);
	});

	it('logs errors when policy evaluation throws synchronously', () => {
		const runtime = createKernelRuntime();
		const reporter = runtime.dataviews.reporter;
		runtime.policies = {
			policy: {
				can: jest.fn(() => {
					throw new Error('broken');
				}),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.delete',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions?.[0]?.disabled).toBe(true);
		expect(reporter.error).toHaveBeenCalledWith(
			'Policy evaluation threw an error',
			expect.objectContaining({ policy: 'jobs.delete' })
		);
	});

	it('respects invalidateOnSuccess overrides', async () => {
		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const deleteAction = Object.assign(actionImpl, {
			actionName: 'jobs.delete',
			options: { scope: 'crossTab', bridged: true },
		}) as DefinedAction<unknown, unknown>;

		const resourceInvalidate = jest.fn();
		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: resourceInvalidate,
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'delete',
					action: deleteAction,
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ items }) => items,
					invalidateOnSuccess: () => false,
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];

		await act(async () => {
			await props.actions[0].callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.invalidate).not.toHaveBeenCalled();
		expect(resourceInvalidate).not.toHaveBeenCalled();
	});

	it('renders fetchList results when resource has no list hook', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockResolvedValue({
			items: [{ id: 3 }, { id: 4 }],
			total: 2,
		});

		const resource = {
			name: 'jobs',
			useList: undefined,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

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

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.data).toEqual([{ id: 3 }, { id: 4 }]);
		expect(props.paginationInfo.totalItems).toBe(2);
	});

	it('prefers fetchList override when resource provides useList', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockResolvedValue({
			items: [{ id: 10 }],
			total: 1,
		});

		const resourceUseList = jest.fn(() => ({
			data: { items: [{ id: 99 }], total: 1 },
			isLoading: false,
			error: undefined,
		}));

		const resource = {
			name: 'jobs',
			useList: resourceUseList,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

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

		expect(resourceUseList).not.toHaveBeenCalled();

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.data).toEqual([{ id: 10 }]);
		expect(props.paginationInfo.totalItems).toBe(1);
	});

	it('handles fetch rejections with non-error values', async () => {
		const runtime = createKernelRuntime();
		const fetchList = jest.fn().mockRejectedValue('fail');

		const resource = {
			name: 'jobs',
			useList: undefined,
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

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

		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Standalone DataViews fetch failed',
			expect.objectContaining({ error: 'fail' })
		);
	});

	it('merges default layouts and honours search configuration', () => {
		const runtime = createKernelRuntime();
		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [], total: 0 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
				layout: { columns: ['title'] },
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			defaultLayouts: { table: { perPage: 20 } },
			search: false,
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.search).toBe(false);
		expect(props.view.layout).toEqual({ columns: ['title'] });
	});

	it('treats actions as allowed when no policy runtime is available', () => {
		const runtime = createKernelRuntime();
		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'publish',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.publish',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Publish',
					supportsBulk: true,
					getActionArgs: ({ selection }) => selection,
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions).toHaveLength(1);
		expect(props.actions?.[0]?.disabled).toBe(false);
	});

	it('keeps policy-free actions enabled even with policy runtime present', () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = {
			name: 'jobs',
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
			prefetchList: jest.fn(),
			invalidate: jest.fn(),
			key: jest.fn(() => ['jobs', 'list']),
		} as unknown as ResourceObject<{ id: number }, { search?: string }>;

		const config: ResourceDataViewConfig<
			{ id: number },
			{ search?: string }
		> = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
			actions: [
				{
					id: 'publish',
					action: Object.assign(async () => undefined, {
						actionName: 'jobs.publish',
						options: {
							scope: 'crossTab' as const,
							bridged: true as const,
						},
					}) as DefinedAction<unknown, unknown>,
					label: 'Publish',
					supportsBulk: true,
					getActionArgs: ({ selection }) => selection,
				},
			],
		};

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = DataViewsMock.mock.calls.at(-1)?.[0];
		expect(props.actions).toHaveLength(1);
		expect(props.actions?.[0]?.disabled).toBe(false);
	});
});
