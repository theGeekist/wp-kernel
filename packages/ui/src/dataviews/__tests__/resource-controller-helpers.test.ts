import type { View } from '@wordpress/dataviews';
import type {
	DataViewsControllerRuntime,
	ResourceDataViewConfig,
} from '../types';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import {
	__TESTING__ as resourceControllerTestUtils,
	createResourceDataViewController,
} from '../resource-controller';

describe('resource-controller helpers', () => {
	const {
		toRecord,
		mergeLayouts,
		mergeViews,
		ensurePositive,
		deriveViewState,
		ensureQueryMapping,
		resolveRuntime,
	} = resourceControllerTestUtils;

	it('converts objects to records and ignores arrays', () => {
		expect(toRecord({ value: 1 })).toEqual({ value: 1 });
		expect(toRecord([1, 2, 3])).toBeUndefined();
		expect(toRecord(undefined)).toBeUndefined();
	});

	it('merges layouts from default and stored views', () => {
		const defaultView = {
			type: 'table',
			layout: { density: 'compact', columns: 3 },
		} as unknown as View;
		const storedView = {
			type: 'table',
			layout: { columns: 5, order: ['name'] },
		} as unknown as View;

		expect(mergeLayouts(defaultView, storedView)).toEqual({
			density: 'compact',
			columns: 5,
			order: ['name'],
		});
		expect(mergeLayouts(defaultView, undefined)).toEqual({
			density: 'compact',
			columns: 3,
		});
		expect(mergeLayouts({} as View, undefined)).toBeUndefined();
	});

	it('merges view state while preserving layout information', () => {
		const defaultView = {
			type: 'table',
			layout: { density: 'default' },
			filters: [{ field: 'status', value: 'draft' }],
			fields: ['title'],
			sort: { field: 'title', direction: 'asc' },
		} as unknown as View;

		const storedView = {
			type: 'table',
			layout: { density: 'compact' },
			filters: undefined,
			fields: ['title', 'author'],
			sort: undefined,
			search: 'query',
		} as unknown as View;

		const merged = mergeViews(defaultView, storedView);
		expect((merged as { layout?: unknown }).layout).toEqual({
			density: 'compact',
		});
		expect(merged.filters).toEqual([{ field: 'status', value: 'draft' }]);
		expect(merged.fields).toEqual(['title', 'author']);
		expect(merged.sort).toEqual({ field: 'title', direction: 'asc' });
	});

	it('ensures positive numeric values with fallback', () => {
		expect(ensurePositive(5, 1)).toBe(5);
		expect(ensurePositive(0, 1)).toBe(1);
		expect(ensurePositive(-3, 2)).toBe(2);
		expect(ensurePositive(Number.NaN, 3)).toBe(3);
	});

	it('derives view state with normalized filters and pagination', () => {
		const fallback = {
			fields: ['title'],
			page: 2,
			perPage: 25,
			filters: [{ field: 'status', value: 'draft' }],
		} as unknown as View;

		const view = {
			filters: [
				{ field: 'status', value: 'published' },
				{ field: 'author', value: 'admin' },
			],
			page: 0,
			perPage: -10,
			search: undefined,
			sort: { field: 'title', direction: 'desc' },
		} as unknown as View;

		expect(deriveViewState(view, fallback)).toEqual({
			fields: ['title'],
			sort: { field: 'title', direction: 'desc' },
			search: undefined,
			filters: {
				status: 'published',
				author: 'admin',
			},
			page: 2,
			perPage: 25,
		});
	});

	it('ensures query mapping resolution and throws when missing', () => {
		const baseConfig: ResourceDataViewConfig<unknown, unknown> = {
			fields: [],
			defaultView: { type: 'table', fields: [] } as View,
			mapQuery: jest.fn(),
		};
		const options = {
			config: baseConfig,
			runtime: {} as unknown as DataViewsControllerRuntime,
			namespace: 'tests',
			resourceName: 'jobs',
		} as const;

		const explicit = jest.fn();
		expect(
			ensureQueryMapping(
				options as unknown as Parameters<typeof ensureQueryMapping>[0],
				explicit
			)
		).toBe(explicit);

		const configMapping = jest.fn();
		expect(
			ensureQueryMapping({
				config: {
					...baseConfig,
					mapQuery: configMapping,
				},
				runtime: {} as unknown as DataViewsControllerRuntime,
				namespace: 'tests',
				resourceName: 'jobs',
			} as unknown as Parameters<typeof ensureQueryMapping>[0])
		).toBe(configMapping);

		expect(() =>
			ensureQueryMapping({
				config: {
					fields: [],
					defaultView: { type: 'table', fields: [] } as View,
					mapQuery: undefined as unknown as never,
				} as unknown as ResourceDataViewConfig<unknown, unknown>,
				runtime: {} as unknown as DataViewsControllerRuntime,
				namespace: 'tests',
				resourceName: 'jobs',
			} as unknown as Parameters<typeof ensureQueryMapping>[0])
		).toThrow(DataViewsControllerError);
	});

	it('validates runtime objects', () => {
		const runtime = {
			preferences: {
				adapter: {
					get: async () => undefined,
					set: async () => undefined,
				},
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
			},
			registry: new Map(),
			controllers: new Map(),
			reporter: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(() => ({
					debug: jest.fn(),
					error: jest.fn(),
					info: jest.fn(),
					warn: jest.fn(),
					child: jest.fn(),
				})),
			},
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(),
		} as unknown as DataViewsControllerRuntime;
		expect(resolveRuntime(runtime)).toBe(runtime);
		expect(() =>
			resolveRuntime(undefined as unknown as DataViewsControllerRuntime)
		).toThrow(DataViewsControllerError);
	});
});

describe('createResourceDataViewController error handling', () => {
	function createController(
		overrides: Partial<
			Parameters<typeof createResourceDataViewController>[0]
		> = {}
	) {
		const reporter = {
			error: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
		};
		const runtime = {
			preferences: {
				get: jest.fn(async () => undefined),
				set: jest.fn(async () => undefined),
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
			},
			getResourceReporter: jest.fn(() => reporter),
		};

		const controller = createResourceDataViewController({
			resourceName: 'jobs',
			namespace: 'tests',
			config: {
				defaultView: {
					fields: ['title'],
					perPage: 20,
					page: 1,
					type: 'table',
				} as View,
				fields: [{ id: 'title', label: 'Title' }],
				mapQuery: () => ({}),
			},
			runtime: runtime as any,
			queryMapping: () => ({}) as never,
			...overrides,
		});

		return { controller, runtime, reporter };
	}

	it('logs errors when loading stored view fails', async () => {
		const { controller, runtime, reporter } = createController();
		const error = new Error('load failed');
		runtime.preferences.get.mockRejectedValueOnce(error);

		await expect(controller.loadStoredView()).resolves.toBeUndefined();
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to load DataViews preferences',
			expect.objectContaining({ error })
		);
	});

	it('logs errors when saving view fails', async () => {
		const { controller, runtime, reporter } = createController();
		const error = new Error('save failed');
		runtime.preferences.set.mockRejectedValueOnce(error);

		await expect(
			controller.saveView({ type: 'table' } as View)
		).resolves.toBeUndefined();
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to persist DataViews preferences',
			expect.objectContaining({ error })
		);
	});
});
