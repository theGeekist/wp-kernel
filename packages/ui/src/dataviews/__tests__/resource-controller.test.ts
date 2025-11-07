import type { View } from '@wordpress/dataviews';
import type { WPKUICapabilityRuntime } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import { createResourceDataViewController } from '../resource-controller';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import type {
	DataViewsControllerRuntime,
	ResourceDataViewConfig,
} from '../types';

describe('createResourceDataViewController', () => {
	function createReporter(): Reporter {
		return {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => createReporter()),
		} as unknown as Reporter;
	}

	function createRuntime(): DataViewsControllerRuntime {
		const preferencesStore = new Map<string, unknown>();
		return {
			registry: new Map(),
			controllers: new Map(),
			preferences: {
				adapter: {
					get: async (key: string) => preferencesStore.get(key),
					set: async (key: string, value: unknown) => {
						preferencesStore.set(key, value);
					},
				},
				get: async (key: string) => preferencesStore.get(key),
				set: async (key: string, value: unknown) => {
					preferencesStore.set(key, value);
				},
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
				permissionDenied: jest.fn(),
				fetchFailed: jest.fn(),
				boundaryChanged: jest.fn(),
			},
			reporter: createReporter(),
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(() => createReporter()),
		};
	}

	const config: ResourceDataViewConfig<{ id: number }, { search?: string }> =
		{
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
			} as View,
			mapQuery: (state) => ({ search: state.search }),
		};

	it('throws when resource name missing', () => {
		const runtime = createRuntime();
		expect(() =>
			createResourceDataViewController({
				config,
				runtime,
				namespace: 'tests',
			})
		).toThrow(DataViewsControllerError);
	});

	it('maps view state through query mapping', () => {
		const runtime = createRuntime();
		const controller = createResourceDataViewController({
			resourceName: 'jobs',
			config,
			runtime,
			namespace: 'tests',
		});

		const view: View = {
			type: 'table',
			fields: ['title'],
			perPage: 20,
			page: 2,
			search: 'engineer',
		} as View;

		expect(controller.mapViewToQuery(view)).toEqual({
			search: 'engineer',
		});
	});

	it('loads and persists preferences', async () => {
		const runtime = createRuntime();
		const controller = createResourceDataViewController({
			resourceName: 'jobs',
			config,
			runtime,
			namespace: 'tests',
		});

		await controller.saveView({
			type: 'table',
			fields: ['title'],
			perPage: 30,
			page: 3,
		} as View);

		const loaded = await controller.loadStoredView();
		expect(loaded?.perPage).toBe(30);
		expect(loaded?.page).toBe(3);
	});

	it('emits view change events', () => {
		const runtime = createRuntime();
		const controller = createResourceDataViewController({
			resourceName: 'jobs',
			config,
			runtime,
			namespace: 'tests',
		});

		const view: View = {
			type: 'table',
			fields: ['title'],
			perPage: 15,
			page: 1,
			sort: { field: 'title', direction: 'desc' },
		} as View;

		controller.emitViewChange(view);
		expect(runtime.events.viewChanged).toHaveBeenCalledWith({
			resource: 'jobs',
			viewState: {
				fields: ['title'],
				filters: undefined,
				search: undefined,
				perPage: 15,
				page: 1,
				sort: { field: 'title', direction: 'desc' },
			},
		});
	});

	it('resolves capabilities using accessor function', () => {
		const runtime = createRuntime();
		const capabilityRuntime: { current?: WPKUICapabilityRuntime } = {};

		const controller = createResourceDataViewController({
			resourceName: 'jobs',
			config,
			runtime,
			namespace: 'tests',
			capabilities: () => capabilityRuntime.current,
		});

		expect(controller.capabilities).toBeUndefined();

		const capabilities = {
			capability: { can: jest.fn() },
		} as unknown as WPKUICapabilityRuntime;
		capabilityRuntime.current = capabilities;

		expect(controller.capabilities).toBe(capabilities);
	});
});
