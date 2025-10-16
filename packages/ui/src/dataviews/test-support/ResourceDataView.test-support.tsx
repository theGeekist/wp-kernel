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

type RenderResourceDataViewResult<TItem, TQuery> = {
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
