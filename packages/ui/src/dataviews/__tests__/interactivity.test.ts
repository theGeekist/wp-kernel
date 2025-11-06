import type { View } from '@wordpress/dataviews';
import type { Reporter } from '@wpkernel/core/reporter';
import type { WPKernelRegistry } from '@wpkernel/core/data';
import type { ResourceObject } from '@wpkernel/core/resource';
import { createDataViewInteraction } from '../interactivity/createDataViewInteraction';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import { defineInteraction } from '@wpkernel/core/interactivity';
import type { InteractivityStoreResult } from '@wpkernel/core/interactivity';

jest.mock('@wpkernel/core/interactivity', () => ({
	defineInteraction: jest.fn(),
}));

type TestItem = { id: number };
type TestQuery = { page: number; filters: Record<string, unknown> };

type ControllerOverrides = Partial<
	ResourceDataViewController<TestItem, TestQuery>
>;

const defineInteractionMock = defineInteraction as jest.MockedFunction<
	typeof defineInteraction
>;

function createReporter(): jest.Mocked<Reporter> {
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

function buildView(overrides: Partial<View> = {}): View {
	return {
		fields: ['title'],
		filters: [
			{
				field: 'status',
				operator: 'is',
				value: 'open',
			},
		],
		sort: { field: 'title', direction: 'asc' },
		search: 'alpha',
		page: 1,
		perPage: 25,
		...overrides,
	} as View;
}

function createController(
	reporter: Reporter,
	overrides: ControllerOverrides = {}
): ResourceDataViewController<TestItem, TestQuery> {
	const defaultView = buildView();

	const controller = {
		resource: {
			name: 'jobs',
			storeKey: 'wpk/jobs',
		} as unknown as ResourceObject<TestItem, TestQuery>,
		resourceName: 'jobs',
		config: {
			defaultView,
			fields: [],
		},
		queryMapping: jest.fn(),
		runtime: {} as DataViewsRuntimeContext['dataviews'],
		namespace: 'tests',
		preferencesKey: 'tests.jobs',
		invalidate: jest.fn(),
		mapViewToQuery: jest.fn().mockImplementation(
			(view: View) =>
				({
					page: (view as { page?: number }).page ?? 1,
					filters: (
						(
							view as {
								filters?: Array<{
									field: string;
									value: unknown;
								}>;
							}
						).filters ?? []
					).reduce<Record<string, unknown>>((acc, filter) => {
						acc[filter.field] = filter.value;
						return acc;
					}, {}),
				}) as TestQuery
		),
		deriveViewState: jest.fn().mockImplementation((view: View) => ({
			fields: view.fields ?? [],
			sort: (
				view as { sort?: { field: string; direction: 'asc' | 'desc' } }
			).sort,
			search: (view as { search?: string }).search,
			filters: (
				(
					view as {
						filters?: Array<{ field: string; value: unknown }>;
					}
				).filters ?? []
			).reduce<Record<string, unknown>>((acc, filter) => {
				acc[filter.field] = filter.value;
				return acc;
			}, {}),
			page: (view as { page?: number }).page ?? 1,
			perPage: (view as { perPage?: number }).perPage ?? 20,
		})),
		loadStoredView: jest.fn().mockResolvedValue(undefined),
		saveView: jest.fn().mockResolvedValue(undefined),
		emitViewChange: jest.fn(),
		emitRegistered: jest.fn(),
		emitUnregistered: jest.fn(),
		emitAction: jest.fn(),
		getReporter: jest.fn(() => reporter),
	} as unknown as ResourceDataViewController<TestItem, TestQuery>;

	return { ...controller, ...overrides };
}

function createRuntime(
	controller: ResourceDataViewController<TestItem, TestQuery>,
	reporter: Reporter
): DataViewsRuntimeContext {
	const registry = {
		dispatch: jest.fn(),
	} as unknown as WPKernelRegistry;
	const runtime = {
		registry,
		controllers: new Map<string, unknown>([
			[controller.resourceName, controller],
		]),
		preferences: {
			get: jest.fn(),
			set: jest.fn(),
			adapter: { get: jest.fn(), set: jest.fn() },
			getScopeOrder: jest.fn(),
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
	} as unknown as DataViewsRuntimeContext['dataviews'];

	(controller as { runtime: DataViewsRuntimeContext['dataviews'] }).runtime =
		runtime;

	return {
		namespace: 'tests',
		dataviews: runtime,
		registry,
		reporter,
	} satisfies DataViewsRuntimeContext;
}

beforeEach(() => {
	defineInteractionMock.mockReset();
	defineInteractionMock.mockImplementation((config) => ({
		namespace: config.namespace ?? 'tests',
		store: config.store as InteractivityStoreResult,
		syncServerState: jest.fn(),
		getServerState: jest.fn(() => ({}) as InteractivityStoreResult),
	}));
});

it('resolves controllers from the runtime map', () => {
	const reporter = createReporter();
	const controller = createController(reporter);
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		resourceName: 'jobs',
	});

	expect(interaction.controller).toBe(controller);
	expect(defineInteractionMock).toHaveBeenCalledWith(
		expect.objectContaining({
			resource: controller.resource,
			feature: 'list',
			namespace: 'tests',
			registry: runtime.registry,
		})
	);
	expect((interaction.store as { state?: unknown }).state).toBe(
		interaction.getState()
	);
});

it('updates state when the controller emits view changes', () => {
	const reporter = createReporter();
	const controller = createController(reporter);
	const originalEmit = controller.emitViewChange as jest.Mock;
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	const initialState = interaction.getState();
	expect(initialState.query).toEqual({
		page: 1,
		filters: { status: 'open' },
	});

	const nextView = buildView({
		page: 2,
		filters: [
			{ field: 'status', operator: 'is', value: 'closed' },
			{ field: 'assigned', operator: 'is', value: 'user' },
		],
	});

	controller.emitViewChange(nextView);

	expect(originalEmit).toHaveBeenCalledWith(nextView);
	expect(interaction.getState()).toEqual({
		selection: [],
		view: expect.objectContaining({
			page: 2,
			perPage: 25,
			filters: { status: 'closed', assigned: 'user' },
		}),
		query: { page: 2, filters: { status: 'closed', assigned: 'user' } },
	});
});

it('mirrors selection updates from helpers and action emissions', () => {
	const reporter = createReporter();
	const controller = createController(reporter);
	const originalEmitAction = controller.emitAction as jest.Mock;
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	interaction.setSelection([1, '2']);
	expect(interaction.getState().selection).toEqual(['1', '2']);

	controller.emitAction({
		actionId: 'test',
		selection: ['3'],
		permitted: true,
	});

	expect(originalEmitAction).toHaveBeenCalledWith({
		actionId: 'test',
		selection: ['3'],
		permitted: true,
	});
	expect(interaction.getState().selection).toEqual(['3']);
});

it('restores controller methods on teardown', () => {
	const reporter = createReporter();
	const originalEmitViewChange = jest.fn();
	const originalEmitAction = jest.fn();
	const controller = createController(reporter, {
		emitViewChange: originalEmitViewChange,
		emitAction: originalEmitAction,
	});
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	interaction.teardown();

	expect(controller.emitViewChange).toBe(originalEmitViewChange);
	expect(controller.emitAction).toBe(originalEmitAction);
});

it('supports multiple interactions bound to the same controller', () => {
	const reporter = createReporter();
	const originalEmitViewChange = jest.fn();
	const originalEmitAction = jest.fn();
	const controller = createController(reporter, {
		emitViewChange: originalEmitViewChange,
		emitAction: originalEmitAction,
	});

	const runtime = createRuntime(controller, reporter);

	const first = createDataViewInteraction({
		runtime,
		feature: 'alpha',
		controller,
	});

	const second = createDataViewInteraction({
		runtime,
		feature: 'beta',
		controller,
	});

	const changedView = buildView({ page: 4 });
	controller.emitViewChange(changedView);

	expect(first.getState().query.page).toBe(4);
	expect(second.getState().query.page).toBe(4);
	expect(originalEmitViewChange).toHaveBeenCalledWith(changedView);

	const payload = { actionId: 'select', selection: ['10'], permitted: true };
	controller.emitAction(payload);

	expect(second.getState().selection).toEqual(['10']);
	expect(first.getState().selection).toEqual(['10']);
	expect(originalEmitAction).toHaveBeenCalledWith(payload);

	first.teardown();

	const nextPayload = {
		actionId: 'other',
		selection: ['11'],
		permitted: true,
	};
	controller.emitAction(nextPayload);

	expect(second.getState().selection).toEqual(['11']);
	expect(first.getState().selection).toEqual(['10']);
	expect(controller.emitViewChange).not.toBe(originalEmitViewChange);

	second.teardown();

	expect(controller.emitViewChange).toBe(originalEmitViewChange);
	expect(controller.emitAction).toBe(originalEmitAction);
});

it('hydrates stored views into the interaction state', async () => {
	const reporter = createReporter();
	const storedView = buildView({
		page: 3,
		filters: [{ field: 'status', operator: 'is', value: 'archived' }],
	});
	const controller = createController(reporter, {
		loadStoredView: jest.fn().mockResolvedValue(storedView),
	});
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	await (controller.loadStoredView as jest.Mock).mock.results[0]?.value;

	expect(interaction.getState()).toEqual({
		selection: [],
		view: expect.objectContaining({
			page: 3,
			filters: { status: 'archived' },
		}),
		query: { page: 3, filters: { status: 'archived' } },
	});
});

it('keeps the latest view when stored preferences resolve after a view change', async () => {
	const reporter = createReporter();
	let resolveStored: (value: View | undefined) => void = () => {};
	const storedViewPromise = new Promise<View | undefined>((resolve) => {
		resolveStored = resolve;
	});
	const storedView = buildView({
		page: 2,
		filters: [{ field: 'status', operator: 'is', value: 'archived' }],
	});
	const controller = createController(reporter, {
		loadStoredView: jest.fn().mockImplementation(() => storedViewPromise),
	});
	const runtime = createRuntime(controller, reporter);

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	const updatedView = buildView({
		page: 5,
		filters: [{ field: 'status', operator: 'is', value: 'pending' }],
	});

	controller.emitViewChange(updatedView);

	expect(interaction.getState().query.page).toBe(5);

	resolveStored(storedView);
	await storedViewPromise;
	await Promise.resolve();

	expect(interaction.getState().query.page).toBe(5);
	expect(interaction.getState().view).toEqual(
		expect.objectContaining({
			page: 5,
			filters: { status: 'pending' },
		})
	);
});

it('preserves auto-hydrated interactivity state', () => {
	const reporter = createReporter();
	const controller = createController(reporter);
	const runtime = createRuntime(controller, reporter);
	const hydratedView = controller.deriveViewState(
		buildView({
			page: 5,
			filters: [{ field: 'status', operator: 'is', value: 'pending' }],
		})
	);
	const hydratedQuery = controller.mapViewToQuery(
		buildView({
			page: 5,
			filters: [{ field: 'status', operator: 'is', value: 'pending' }],
		})
	);

	defineInteractionMock.mockImplementationOnce((config) => {
		(config.store as { state: unknown }).state = {
			selection: [101, '102'],
			view: hydratedView,
			query: hydratedQuery,
		};

		return {
			namespace: config.namespace ?? 'tests',
			store: config.store as InteractivityStoreResult,
			syncServerState: jest.fn(),
			getServerState: jest.fn(() => ({}) as InteractivityStoreResult),
		};
	});

	const interaction = createDataViewInteraction({
		runtime,
		feature: 'list',
		controller,
	});

	expect(interaction.getState()).toEqual({
		selection: ['101', '102'],
		view: hydratedView,
		query: hydratedQuery,
	});
});

it('throws when controller resolution fails', () => {
	const reporter = createReporter();
	const controller = createController(reporter);
	const runtime = createRuntime(controller, reporter);

	runtime.dataviews.controllers.clear();

	expect(() =>
		createDataViewInteraction({
			runtime,
			feature: 'list',
			resourceName: 'missing',
		})
	).toThrow(DataViewsControllerError);
});

it('throws when no resource definition is available', () => {
	const reporter = createReporter();
	const controller = createController(reporter, {
		resource: undefined,
	});
	const runtime = createRuntime(controller, reporter);

	expect(() =>
		createDataViewInteraction({
			runtime,
			feature: 'list',
			controller,
		})
	).toThrow(DataViewsControllerError);
});
