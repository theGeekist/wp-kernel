import { act, type ComponentProps, type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { DataViews } from '@wordpress/dataviews';
import { KernelUIProvider } from '../../runtime/context';
import type { KernelUIRuntime } from '@wpkernel/core/data';
import type { DefinedAction } from '@wpkernel/core/actions';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
	ResourceDataViewActionConfig,
} from '../types';
import { KernelError } from '@wpkernel/core/contracts';
import { ResourceDataView } from '../ResourceDataView';

jest.mock('@wordpress/dataviews', () => {
	const mockComponent = jest.fn(() => null);
	return {
		__esModule: true,
		DataViews: mockComponent,
	};
});

export const DataViewsMock = DataViews as unknown as jest.Mock;

setReactActEnvironment();

function setReactActEnvironment() {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
}

export function createReporter(): Reporter {
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

export type { RuntimeWithDataViews };

export function createKernelRuntime(): RuntimeWithDataViews {
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

export function renderWithProvider(
	ui: React.ReactElement,
	runtime: KernelUIRuntime
): RenderResult & { rerenderWithProvider: (next: React.ReactElement) => void } {
	let result: RenderResult | undefined;
	act(() => {
		result = render(
			<KernelUIProvider runtime={runtime}>{ui}</KernelUIProvider>
		);
	});

	if (!result) {
		throw new KernelError('DeveloperError', {
			message: 'Failed to render with KernelUIProvider',
		});
	}

	const rerenderWithProvider = (next: React.ReactElement) => {
		act(() => {
			result!.rerender(
				<KernelUIProvider runtime={runtime}>{next}</KernelUIProvider>
			);
		});
	};

	return Object.assign(result, { rerenderWithProvider });
}

export function createAction(
	impl: jest.Mock,
	options: DefinedAction<unknown, unknown>['options']
): DefinedAction<unknown, unknown> {
	return Object.assign(impl, {
		actionName: 'jobs.action',
		options,
	}) as DefinedAction<unknown, unknown>;
}

export function createResource<TItem, TQuery>(
	overrides: Partial<ResourceObject<TItem, TQuery>> & {
		name?: string;
	}
): ResourceObject<TItem, TQuery> {
	const resource = {
		name: 'jobs',
		useList: jest.fn(),
		prefetchList: jest.fn(),
		invalidate: jest.fn(),
		key: jest.fn(() => ['jobs', 'list']),
		...overrides,
	} as unknown as ResourceObject<TItem, TQuery>;
	return resource;
}

type IdentifiableItem = { id: string | number };

export type DefaultActionInput = { selection: Array<string | number> };

export function buildListResource<
	TItem extends IdentifiableItem,
	TQuery = Record<string, unknown>,
>(
	items: TItem[] = [{ id: 1 } as unknown as TItem],
	overrides: Partial<ResourceObject<TItem, TQuery>> = {}
): ResourceObject<TItem, TQuery> {
	const { useList, ...rest } = overrides;
	const listResolver =
		useList ??
		jest.fn(() => ({
			data: { items, total: items.length },
			isLoading: false,
			error: undefined,
		}));

	return createResource<TItem, TQuery>({
		...rest,
		useList: listResolver as ResourceObject<TItem, TQuery>['useList'],
	});
}

export function buildActionConfig<
	TItem extends IdentifiableItem,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
>(
	overrides: Partial<
		ResourceDataViewActionConfig<TItem, TInput, TResult>
	> = {}
): ResourceDataViewActionConfig<TItem, TInput, TResult> {
	const baseConfig: ResourceDataViewActionConfig<TItem, TInput, TResult> = {
		id: 'delete',
		action: createAction(jest.fn(), {
			scope: 'crossTab',
			bridged: true,
		}) as ResourceDataViewActionConfig<TItem, TInput, TResult>['action'],
		label: 'Delete',
		supportsBulk: true,
		getActionArgs: (({ selection }) =>
			({ selection }) as TInput) as ResourceDataViewActionConfig<
			TItem,
			TInput,
			TResult
		>['getActionArgs'],
	};

	return {
		...baseConfig,
		...overrides,
	};
}

export function createConfig<TItem, TQuery>(
	overrides: Partial<ResourceDataViewConfig<TItem, TQuery>>
): ResourceDataViewConfig<TItem, TQuery> {
	return {
		fields: [{ id: 'title', label: 'Title' }],
		defaultView: {
			type: 'table',
			fields: ['title'],
			perPage: 10,
			page: 1,
		},
		mapQuery: (state) => ({
			search: (state as { search?: string }).search,
		}),
		...overrides,
	} as ResourceDataViewConfig<TItem, TQuery>;
}

export function getLastDataViewsProps(): ComponentProps<typeof DataViews> {
	const lastCall = DataViewsMock.mock.calls.at(-1);
	if (!lastCall) {
		throw new KernelError('DeveloperError', {
			message: 'DataViews was not rendered',
		});
	}
	return lastCall[0] as ComponentProps<typeof DataViews>;
}

export type ResourceDataViewTestProps<TItem, TQuery> = {
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	controller?: ResourceDataViewController<TItem, TQuery>;
	runtime?: KernelUIRuntime | DataViewsRuntimeContext;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	emptyState?: ReactNode;
};

interface RenderResourceDataViewOptions<TItem, TQuery> {
	runtime?: RuntimeWithDataViews;
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	props?: Partial<ResourceDataViewTestProps<TItem, TQuery>>;
}

export type RenderResourceDataViewResult<TItem, TQuery> = {
	runtime: RuntimeWithDataViews;
	resource: ResourceObject<TItem, TQuery>;
	config: ResourceDataViewConfig<TItem, TQuery>;
	props: ResourceDataViewTestProps<TItem, TQuery>;
	rerender: (
		nextProps?: Partial<ResourceDataViewTestProps<TItem, TQuery>>
	) => void;
	renderResult: ReturnType<typeof renderWithProvider>;
	getDataViewProps: () => ComponentProps<typeof DataViews>;
};

export async function flushDataViews(iterations = 1) {
	await act(async () => {
		for (let index = 0; index < iterations; index += 1) {
			await Promise.resolve();
		}
	});
}

export function renderResourceDataView<TItem, TQuery>(
	options: RenderResourceDataViewOptions<TItem, TQuery> = {}
): RenderResourceDataViewResult<TItem, TQuery> {
	const runtime = options.runtime ?? createKernelRuntime();
	const resource = (options.resource ??
		createResource<TItem, TQuery>({})) as ResourceObject<TItem, TQuery>;
	const config = (options.config ??
		createConfig<TItem, TQuery>({})) as ResourceDataViewConfig<
		TItem,
		TQuery
	>;

	const baseProps: ResourceDataViewTestProps<TItem, TQuery> = {
		resource,
		config,
		...(options.props as
			| ResourceDataViewTestProps<TItem, TQuery>
			| undefined),
	};

	const renderResult = renderWithProvider(
		<ResourceDataView {...baseProps} />,
		runtime
	);

	const rerender = (
		nextProps?: Partial<ResourceDataViewTestProps<TItem, TQuery>>
	) => {
		if (nextProps) {
			Object.assign(baseProps, nextProps);
		}
		renderResult.rerenderWithProvider(<ResourceDataView {...baseProps} />);
	};

	return {
		runtime,
		resource,
		config,
		props: baseProps,
		rerender,
		renderResult,
		getDataViewProps: () => getLastDataViewsProps(),
	};
}

export type RenderActionScenarioOptions<
	TItem extends IdentifiableItem,
	TQuery,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
> = {
	runtime?: RuntimeWithDataViews;
	items?: TItem[];
	resource?: ResourceObject<TItem, TQuery>;
	resourceOverrides?: Partial<ResourceObject<TItem, TQuery>>;
	action?: Partial<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	actions?: Array<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	configOverrides?: Partial<ResourceDataViewConfig<TItem, TQuery>>;
	props?: Partial<ResourceDataViewTestProps<TItem, TQuery>>;
};

export type DataViewActionEntry<TItem> = {
	callback: (
		items: TItem[],
		context: { onActionPerformed?: jest.Mock }
	) => Promise<unknown>;
	disabled?: boolean;
};

function getActionEntries<TItem>(
	getDataViewProps: () => { actions?: unknown }
): DataViewActionEntry<TItem>[] {
	const props = getDataViewProps();
	return (props.actions ?? []) as unknown as DataViewActionEntry<TItem>[];
}

export type RenderActionScenarioResult<
	TItem extends IdentifiableItem,
	TQuery,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
> = RenderResourceDataViewResult<TItem, TQuery> & {
	runtime: RuntimeWithDataViews;
	resource: ResourceObject<TItem, TQuery>;
	config: ResourceDataViewConfig<TItem, TQuery>;
	actions: Array<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	getActionEntries: () => DataViewActionEntry<TItem>[];
};

export function renderActionScenario<
	TItem extends IdentifiableItem,
	TQuery = Record<string, unknown>,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
>(
	options: RenderActionScenarioOptions<TItem, TQuery, TInput, TResult> = {}
): RenderActionScenarioResult<TItem, TQuery, TInput, TResult> {
	const runtime = options.runtime ?? createKernelRuntime();
	const resource =
		options.resource ??
		buildListResource<TItem, TQuery>(
			options.items,
			options.resourceOverrides ?? {}
		);
	const scenarioActions = options.actions ?? [
		buildActionConfig<TItem, TInput, TResult>({
			...(options.action as Partial<
				ResourceDataViewActionConfig<TItem, TInput, TResult>
			>),
		}),
	];
	const config = createConfig<TItem, TQuery>({
		actions: scenarioActions as Array<
			ResourceDataViewActionConfig<TItem, unknown, unknown>
		>,
		...(options.configOverrides as Partial<
			ResourceDataViewConfig<TItem, TQuery>
		>),
	});
	const view = renderResourceDataView<TItem, TQuery>({
		runtime,
		resource,
		config,
		props: options.props,
	});

	return {
		...view,
		runtime,
		resource,
		config,
		actions: scenarioActions,
		getActionEntries: () => getActionEntries<TItem>(view.getDataViewProps),
	};
}
