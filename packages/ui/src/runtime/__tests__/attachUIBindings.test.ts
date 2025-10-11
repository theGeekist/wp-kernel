import type {
	KernelInstance,
	KernelRegistry,
	KernelUIRuntime,
	UIIntegrationOptions,
} from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import type { View } from '@wordpress/dataviews';
import {
	KernelEventBus,
	type ResourceDefinedEvent,
	getRegisteredResources,
} from '@geekist/wp-kernel';
import { attachUIBindings } from '../attachUIBindings';
import { attachResourceHooks } from '../../hooks/resource-hooks';
import type { DataViewPreferencesAdapter } from '../dataviews/preferences';
import { defaultPreferencesKey } from '../dataviews/preferences';
import {
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_UNREGISTERED,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
	DATA_VIEWS_EVENT_REGISTERED,
} from '../dataviews/events';
import { DataViewsConfigurationError } from '../dataviews/errors';

jest.mock('../../hooks/resource-hooks', () => ({
	attachResourceHooks: jest.fn((resource) => resource),
}));

jest.mock('@geekist/wp-kernel', () => {
	const actual = jest.requireActual('@geekist/wp-kernel');
	return {
		...actual,
		getRegisteredResources: jest.fn(),
	};
});

const mockAttachResourceHooks = attachResourceHooks as jest.MockedFunction<
	typeof attachResourceHooks
>;
const mockGetRegisteredResources =
	getRegisteredResources as jest.MockedFunction<
		typeof getRegisteredResources
	>;

type PreferencesRegistry = KernelRegistry & {
	__store: Map<string, Map<string, unknown>>;
};

function createPreferencesRegistry(): PreferencesRegistry {
	const store = new Map<string, Map<string, unknown>>();

	const registry = {
		select(storeName: string) {
			if (storeName !== 'core/preferences') {
				return {};
			}

			return {
				get(scope: string, key: string) {
					return store.get(scope)?.get(key);
				},
			};
		},
		dispatch(storeName: string) {
			if (storeName !== 'core/preferences') {
				return {};
			}

			return {
				set(scope: string, key: string, value: unknown) {
					const scopeMap =
						store.get(scope) ?? new Map<string, unknown>();
					if (typeof value === 'undefined') {
						scopeMap.delete(key);
					} else {
						scopeMap.set(key, value);
					}
					store.set(scope, scopeMap);
				},
			};
		},
		__store: store,
	};

	return registry as unknown as PreferencesRegistry;
}

function setPreferenceValue(
	registry: PreferencesRegistry,
	scope: string,
	key: string,
	value: unknown
): void {
	const actions = registry.dispatch('core/preferences') as {
		set: (scope: string, key: string, value: unknown) => void;
	};
	actions.set(scope, key, value);
}

function createReporter(): Reporter {
	const child = jest.fn();
	const reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
	child.mockReturnValue(reporter);
	return reporter;
}

function createReporterWithThrowingChild(): Reporter {
	const child = jest.fn(() => {
		throw new Error('child failure');
	});
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
}

function createReporterWithUndefinedChild(): Reporter {
	const child = jest.fn(() => undefined);
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
}

function createResourceWithDataView(): ResourceObject<
	unknown,
	{ search?: string }
> {
	const reporter = createReporter();
	const resource = {
		name: 'jobs',
		routes: { list: { path: '/jobs', method: 'GET' } },
		cacheKeys: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
		},
		reporter,
		fetchList: jest.fn(),
		prefetchList: jest.fn(),
	} as unknown as ResourceObject<unknown, { search?: string }>;

	(resource as unknown as { ui?: { admin?: { dataviews?: unknown } } }).ui = {
		admin: {
			dataviews: {
				fields: [{ id: 'title', label: 'Title' }],
				defaultView: { type: 'table', fields: ['title'] } as View,
				mapQuery: jest.fn(() => ({ search: undefined })),
			},
		},
	};

	return resource;
}

function createKernel(
	events: KernelEventBus,
	options?: UIIntegrationOptions,
	registry?: KernelRegistry,
	reporter?: Reporter
): KernelInstance {
	const reporterInstance = reporter ?? createReporter();

	const kernel: KernelInstance = {
		getNamespace: () => 'tests',
		getReporter: () => reporterInstance,
		invalidate: jest.fn(),
		emit: jest.fn(),
		teardown: jest.fn(),
		getRegistry: () => registry,
		hasUIRuntime: () => false,
		getUIRuntime: () => undefined,
		attachUIBindings: jest.fn(),
		ui: {
			isEnabled: () => false,
			options,
		},
		events,
		defineResource: jest.fn(),
	};

	return kernel;
}

describe('attachUIBindings', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockGetRegisteredResources.mockReturnValue([]);
		delete (
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: {
					policy?: KernelUIRuntime['policies'];
				};
			}
		).__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('attaches hooks for existing and future resources', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const resourceA = {
			name: 'posts',
			routes: { get: { path: '/posts/:id', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;
		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource: resourceA, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(kernel);

		expect(runtime.kernel).toBe(kernel);
		expect(runtime.namespace).toBe('tests');
		expect(mockAttachResourceHooks).toHaveBeenCalledWith(
			resourceA,
			runtime
		);

		const resourceB = {
			name: 'users',
			routes: { list: { path: '/users', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;

		events.emit('resource:defined', {
			resource: resourceB,
			namespace: 'tests',
		});

		expect(mockAttachResourceHooks).toHaveBeenCalledWith(
			resourceB,
			runtime
		);
	});

	it('provides runtime helpers that proxy to the kernel', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, { suspense: true }, registry);
		const runtime = attachUIBindings(kernel, { notices: true });

		expect(runtime.options).toEqual({ notices: true });
		expect(runtime.reporter).toBe(kernel.getReporter());
		expect(runtime.registry).toBe(registry);

		runtime.invalidate?.(['posts']);
		expect(kernel.invalidate).toHaveBeenCalledWith(['posts'], undefined);
	});

	it('lazily resolves policy runtime from global overrides', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);
		const runtime = attachUIBindings(kernel);

		expect(runtime.policies).toBeUndefined();

		const policy = { can: jest.fn() };
		(
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { policy?: unknown };
			}
		).__WP_KERNEL_ACTION_RUNTIME__ = { policy };

		expect(runtime.policies).toEqual({ policy });
	});

	it('throws configuration error when registry is unavailable', async () => {
		const events = new KernelEventBus();
		const kernel = createKernel(events);

		const originalWp = (window as unknown as { wp?: typeof window.wp }).wp;
		delete (window as unknown as { wp?: typeof window.wp }).wp;

		const runtime = attachUIBindings(kernel);

		try {
			await expect(
				runtime.dataviews?.preferences.get(
					defaultPreferencesKey('tests', 'missing')
				)
			).rejects.toThrow(DataViewsConfigurationError);
		} finally {
			(window as unknown as { wp?: typeof window.wp }).wp = originalWp;
		}
	});

	it('resolves preferences registry from global wp.data when runtime registry missing', async () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter = createReporter();
		const originalWp = (globalThis as { wp?: { data?: KernelRegistry } })
			.wp;
		(globalThis as { wp?: { data?: KernelRegistry } }).wp = {
			data: registry,
		};

		try {
			const kernel = createKernel(events, undefined, undefined, reporter);
			const runtime = attachUIBindings(kernel);
			const dataviews = runtime.dataviews!;
			const key = defaultPreferencesKey('tests', 'global-fallback');

			await dataviews.preferences.set(key, { columns: ['name'] });

			expect(
				registry.__store.get('tests/dataviews/user')?.get(key)
			).toEqual({ columns: ['name'] });
			expect(reporter.debug).toHaveBeenCalledWith(
				'Resolved preferences registry from global wp.data'
			);
		} finally {
			(globalThis as { wp?: { data?: KernelRegistry } }).wp = originalWp;
		}
	});

	it('throws configuration error when core/preferences store is incomplete', async () => {
		const events = new KernelEventBus();
		const registry = {
			select: () => ({}),
			dispatch: () => ({ set: jest.fn() }),
		} as unknown as KernelRegistry;
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);

		await expect(
			runtime.dataviews?.preferences.get(
				defaultPreferencesKey('tests', 'incomplete')
			)
		).rejects.toThrow(DataViewsConfigurationError);
	});

	it('throws configuration error when core/preferences store lacks set action', async () => {
		const events = new KernelEventBus();
		const registry = {
			select: () => ({
				get: jest.fn().mockReturnValue(undefined),
			}),
			dispatch: () => ({}),
		} as unknown as KernelRegistry;
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);

		await expect(
			runtime.dataviews?.preferences.set(
				defaultPreferencesKey('tests', 'no-set'),
				{ columns: [] }
			)
		).rejects.toThrow(DataViewsConfigurationError);
	});

	it('initializes dataviews runtime with default preferences adapter', async () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);
		expect(runtime.dataviews).toBeDefined();

		const dataviews = runtime.dataviews!;
		const key = defaultPreferencesKey('tests', 'jobs');

		expect(dataviews.preferences.getScopeOrder()).toEqual([
			'user',
			'role',
			'site',
		]);
		expect(await dataviews.preferences.get(key)).toBeUndefined();

		const preferenceValue = { columns: ['title'] };
		await dataviews.preferences.set(key, preferenceValue);

		expect(registry.__store.get('tests/dataviews/user')?.get(key)).toEqual(
			preferenceValue
		);

		dataviews.events.registered({
			resource: 'jobs',
			preferencesKey: key,
		});

		expect(kernel.emit).toHaveBeenCalledWith(DATA_VIEWS_EVENT_REGISTERED, {
			resource: 'jobs',
			preferencesKey: key,
		});
	});

	it('auto-registers DataViews controllers for existing resources', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);
		const resource = createResourceWithDataView();

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;
		const controller = dataviews.controllers.get('jobs') as
			| { resourceName: string; preferencesKey: string }
			| undefined;

		expect(controller).toBeDefined();
		expect(controller?.resourceName).toBe('jobs');
		expect(dataviews.registry.get('jobs')).toEqual(
			expect.objectContaining({
				resource: 'jobs',
				preferencesKey: controller?.preferencesKey,
			})
		);
	});

	it('auto-registers DataViews controllers for future resources', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);
		const runtime = attachUIBindings(kernel);
		const resource = createResourceWithDataView();

		events.emit('resource:defined', {
			resource: resource as ResourceObject<unknown, unknown>,
			namespace: 'tests',
		});

		expect(runtime.dataviews?.controllers.get('jobs')).toBeDefined();
	});

	it('skips auto-registration when disabled via options', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(
			events,
			{ dataviews: { enable: true, autoRegisterResources: false } },
			registry
		);
		const resource = createResourceWithDataView();

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(kernel, {
			dataviews: { enable: true, autoRegisterResources: false },
		});

		expect(runtime.dataviews?.controllers.has('jobs')).toBe(false);
	});

	it('resolves preferences using scope precedence', async () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;
		const key = defaultPreferencesKey('tests', 'reports');

		setPreferenceValue(registry, 'tests/dataviews/role', key, 'role-value');
		setPreferenceValue(registry, 'tests/dataviews/site', key, 'site-value');

		expect(await dataviews.preferences.get(key)).toBe('role-value');

		await dataviews.preferences.set(key, 'user-value');
		expect(await dataviews.preferences.get(key)).toBe('user-value');

		setPreferenceValue(registry, 'tests/dataviews/user', key, undefined);
		expect(await dataviews.preferences.get(key)).toBe('role-value');

		setPreferenceValue(registry, 'tests/dataviews/role', key, undefined);
		expect(await dataviews.preferences.get(key)).toBe('site-value');
	});

	it('respects dataviews enable false option', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel, {
			dataviews: { enable: false },
		});

		expect(runtime.dataviews).toBeUndefined();
	});

	it('throws when custom preferences adapter is invalid', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		expect(() =>
			attachUIBindings(kernel, {
				dataviews: {
					preferences: {
						// Intentionally invalid adapter to assert validation behaviour
					} as unknown as DataViewPreferencesAdapter,
				},
			})
		).toThrow(DataViewsConfigurationError);
	});

	it('warns and falls back when reporter child throws', async () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter =
			createReporterWithThrowingChild() as jest.Mocked<Reporter>;
		const kernel = createKernel(events, undefined, registry, reporter);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;
		const key = defaultPreferencesKey('tests', 'faulty-reporter');

		await dataviews.preferences.set(key, { columns: ['status'] });

		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({
				namespace: 'ui.dataviews',
				error: expect.any(Error),
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({
				namespace: 'preferences',
				error: expect.any(Error),
			})
		);
	});

	it('reuses base reporter when child reporter is unavailable', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter =
			createReporterWithUndefinedChild() as jest.Mocked<Reporter>;
		const kernel = createKernel(events, undefined, registry, reporter);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;

		const resourceReporter = dataviews.getResourceReporter('jobs');
		resourceReporter.debug('resource reporter fallback');

		expect(reporter.child).toHaveBeenCalled();
		expect(dataviews.reporter).toBe(reporter);
		expect(reporter.debug).toHaveBeenCalledWith(
			'resource reporter fallback'
		);
	});

	it('reports when DataViews event emission fails', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;
		const reporter = kernel.getReporter() as jest.Mocked<Reporter>;

		(kernel.emit as jest.Mock).mockImplementation(() => {
			throw new Error('emit failure');
		});

		dataviews.events.actionTriggered({
			resource: 'jobs',
			actionId: 'jobs.delete',
			selection: [],
			permitted: true,
		});

		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to emit DataViews event',
			expect.objectContaining({
				event: DATA_VIEWS_EVENT_ACTION_TRIGGERED,
				error: expect.any(Error),
			})
		);
	});

	it('emits DataViews view change and unregistered events', () => {
		const events = new KernelEventBus();
		const registry = createPreferencesRegistry();
		const kernel = createKernel(events, undefined, registry);

		const runtime = attachUIBindings(kernel);
		const dataviews = runtime.dataviews!;
		const reporter = kernel.getReporter() as jest.Mocked<Reporter>;

		dataviews.events.viewChanged({
			resource: 'jobs',
			viewState: {
				fields: ['title'],
				page: 1,
				perPage: 20,
			},
		});

		dataviews.events.unregistered({
			resource: 'jobs',
			preferencesKey: defaultPreferencesKey('tests', 'jobs'),
		});

		expect(kernel.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			expect.objectContaining({ resource: 'jobs' })
		);
		expect(kernel.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_UNREGISTERED,
			expect.objectContaining({ resource: 'jobs' })
		);
		expect(reporter.debug).toHaveBeenCalledWith(
			'Emitted DataViews event',
			expect.objectContaining({ event: DATA_VIEWS_EVENT_VIEW_CHANGED })
		);
	});
});
