import { createElement, type ReactNode } from 'react';
import {
	defineResource,
	type ResourceObject,
} from '@geekist/wp-kernel/resource';
import {
	clearRegisteredResources,
	type ResourceDefinedEvent,
} from '@geekist/wp-kernel/events';
import {
	attachResourceHooks,
	type UseResourceListResult,
} from '../resource-hooks';
import { KernelEventBus } from '@geekist/wp-kernel/events';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { attachUIBindings, KernelUIProvider } from '../../runtime';
import type {
	KernelInstance,
	KernelUIRuntime,
	KernelRegistry,
} from '@geekist/wp-kernel/data';
import { renderHook } from '../testing/test-utils';

interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

describe('resource hooks (UI integration)', () => {
	let mockWpData: {
		useSelect: jest.Mock;
		select: jest.Mock;
		dispatch: jest.Mock;
		createReduxStore?: jest.Mock;
		register?: jest.Mock;
	};
	let originalWp: Window['wp'];

	const noopReporter: Reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(),
	};

	function createRuntime(
		overrides: Partial<KernelUIRuntime> = {}
	): KernelUIRuntime {
		const registry = Object.prototype.hasOwnProperty.call(
			overrides,
			'registry'
		)
			? overrides.registry
			: (mockWpData as unknown as KernelRegistry | undefined);

		return {
			namespace: 'tests',
			reporter: overrides.reporter ?? noopReporter,
			registry,
			events: overrides.events ?? new KernelEventBus(),
			invalidate: overrides.invalidate ?? jest.fn(),
			kernel: overrides.kernel,
			policies: overrides.policies,
			options: overrides.options,
		};
	}

	function createWrapper(runtime: KernelUIRuntime) {
		return function Wrapper({ children }: { children: ReactNode }) {
			return createElement(KernelUIProvider, { runtime, children });
		};
	}

	function renderUseGetHook<T, Q>(
		resource: ResourceObject<T, Q>,
		id: string | number,
		runtimeOverrides?: Partial<KernelUIRuntime>
	) {
		const runtime = createRuntime(runtimeOverrides);
		return renderHook(() => resource.useGet!(id), {
			wrapper: createWrapper(runtime),
		});
	}

	function renderUseListHook<T, Q>(
		resource: ResourceObject<T, Q>,
		query?: Q,
		runtimeOverrides?: Partial<KernelUIRuntime>
	) {
		const runtime = createRuntime(runtimeOverrides);
		return renderHook(() => resource.useList!(query), {
			wrapper: createWrapper(runtime),
		});
	}

	function withConsoleErrorSuppressed(callback: () => void) {
		const consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		try {
			callback();
		} finally {
			consoleErrorSpy.mockRestore();
		}
	}

	beforeEach(() => {
		clearRegisteredResources();
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;
		mockWpData = {
			useSelect: jest.fn(),
			select: jest.fn(),
			dispatch: jest.fn(),
		};
		windowWithWp.wp = {
			data: mockWpData,
		};
	});

	afterEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		windowWithWp.wp = originalWp;
		jest.restoreAllMocks();
	});

	describe('useGet hook', () => {
		it('throws when @wordpress/data is not available', () => {
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				}
			);

			withConsoleErrorSuppressed(() => {
				expect(() => renderUseGetHook(resource, 1)).toThrow(
					'useGet requires @wordpress/data to be loaded'
				);
			});
		});

		it('invokes useSelect with correct selector', () => {
			const mockItem: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(mockItem),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(undefined),
				};
				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				}
			);

			const { result } = renderUseGetHook(resource, 1);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result.current).toEqual({
				data: mockItem,
				isLoading: false,
				error: undefined,
			});
		});

		it('sets loading state when selector resolving', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getItemError: jest.fn().mockReturnValue(undefined),
				};
				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				}
			);

			const { result } = renderUseGetHook(resource, 1);

			expect(result.current).toEqual({
				data: undefined,
				isLoading: true,
				error: undefined,
			});
		});

		it('exposes selector error message', () => {
			const mockError = 'Not found';
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				}
			);

			const { result } = renderUseGetHook(resource, 1);

			expect(result.current).toEqual({
				data: undefined,
				isLoading: false,
				error: 'Not found',
			});
		});
		it('keeps items loading until resolution completes', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue({
						id: 5,
						title: 'Pending',
						status: 'draft',
					}),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getItemError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						get: { path: '/wpk/v1/things/:id', method: 'GET' },
					},
				}
			);

			const { result } = renderUseGetHook(resource, 5);

			expect(result.current.isLoading).toBe(true);
			expect(result.current.data).toMatchObject({
				id: 5,
				title: 'Pending',
			});
		});
	});

	describe('useList hook', () => {
		it('throws when @wordpress/data is not available', () => {
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			withConsoleErrorSuppressed(() => {
				expect(() => renderUseListHook(resource)).toThrow(
					'useList requires @wordpress/data to be loaded'
				);
			});
		});

		it('returns list data and loading state', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			];

			const mockListResponse = {
				items: mockItems,
				total: mockItems.length,
				page: 1,
				perPage: 10,
			};

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockListResponse),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});
			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result.current).toEqual({
				data: mockListResponse,
				isLoading: false,
				error: undefined,
			} as UseResourceListResult<MockThing>);
		});
		it('passes query parameter to selector', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const query: MockThingQuery = { status: 'active' };

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockItems),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource, query);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result.current.data).toEqual(mockItems);
		});

		it('derives loading state from status', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('loading'),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);

			expect(result.current).toEqual({
				data: undefined,
				isLoading: true,
				error: null,
			});
		});

		it('trusts success status over hasFinishedResolution (regression test)', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const mockListResponse = {
				items: mockItems,
				total: mockItems.length,
				page: 1,
				perPage: 10,
			};

			// This is the WordPress quirk: status is 'success' but hasFinishedResolution is false
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockListResponse),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(false), // WordPress quirk!
					getListError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);

			// Should NOT be loading despite hasFinishedResolution being false
			// because status explicitly says 'success'
			expect(result.current).toEqual({
				data: mockListResponse,
				isLoading: false, // This is the critical assertion!
				error: undefined,
			});
		});

		it('propagates selector errors', () => {
			const mockError = 'Server error';
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('error'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);

			expect(result.current).toEqual({
				data: undefined,
				isLoading: false,
				error: mockError,
			});
		});

		it('treats idle lists without resolution as loading', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('idle'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getListError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);
			expect(result.current.isLoading).toBe(true);
		});

		it('keeps success lists loading while resolver runs', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest
						.fn()
						.mockReturnValue([
							{ id: 9, title: 'Entry', status: 'active' },
						]),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResourceWithHooks<MockThing, MockThingQuery>(
				{
					name: 'thing',
					routes: {
						list: { path: '/wpk/v1/things', method: 'GET' },
					},
				}
			);

			const { result } = renderUseListHook(resource);
			expect(result.current.isLoading).toBe(true);
			expect(result.current.data).toHaveLength(1);
		});
	});

	it('exposes manual attach helper for existing resources', () => {
		const resource = defineResource<MockThing, MockThingQuery>({
			name: 'thing',
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		// Remove hooks assigned during definition
		resource.useGet = undefined;
		attachResourceHooks(resource);

		expect(typeof resource.useGet).toBe('function');
	});

	it('handles SSR environment gracefully (window undefined)', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		if (!descriptor?.configurable) {
			// Skip if window cannot be modified
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const originalWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		const resource = defineResourceWithHooks<MockThing, MockThingQuery>({
			name: 'thing',
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		withConsoleErrorSuppressed(() => {
			expect(() => {
				renderUseGetHook(resource, 1, { registry: undefined });
			}).toThrow('useGet requires @wordpress/data to be loaded');
		});

		Object.defineProperty(globalThis, 'window', {
			...descriptor,
			value: originalWindow,
		});
	});

	it('attaches hooks when kernel emits resource:defined events', () => {
		const bus = new KernelEventBus();
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		};

		const kernelStub = {
			getNamespace: () => 'tests',
			getReporter: () => reporter,
			invalidate: jest.fn(),
			emit: jest.fn(),
			teardown: jest.fn(),
			getRegistry: () => undefined,
			hasUIRuntime: () => false,
			getUIRuntime: () => undefined,
			attachUIBindings: jest.fn(),
			ui: { isEnabled: () => false, options: undefined },
			events: bus,
		} as unknown as KernelInstance;

		const runtime = attachUIBindings(kernelStub);

		const resource1 = {
			name: 'Resource1',
			routes: { get: { path: '/test/1', method: 'GET' } },
		} as ResourceDefinedEvent['resource'];
		const resource2 = {
			name: 'Resource2',
			routes: { list: { path: '/test/2', method: 'GET' } },
		} as ResourceDefinedEvent['resource'];

		runtime.events.emit('resource:defined', {
			resource: resource1,
			namespace: 'tests',
		});
		runtime.events.emit('resource:defined', {
			resource: resource2,
			namespace: 'tests',
		});

		expect(typeof (resource1 as any).useGet).toBe('function');
		expect(typeof (resource2 as any).useList).toBe('function');
	});

	it('does not attach hooks when routes are missing', () => {
		const resource = {
			name: 'empty',
			routes: {},
		} as unknown as ResourceObject<MockThing, MockThingQuery>;

		attachResourceHooks(resource);

		expect(resource.useGet).toBeUndefined();
		expect(resource.useList).toBeUndefined();
	});

	it('treats unknown list statuses as resolved', () => {
		mockWpData.useSelect.mockImplementation((callback: any) => {
			const mockSelect = {
				getList: jest.fn().mockReturnValue([]),
				getListStatus: jest.fn().mockReturnValue('ready'),
				isResolving: jest.fn().mockReturnValue(false),
				hasFinishedResolution: jest.fn().mockReturnValue(undefined),
				getListError: jest.fn().mockReturnValue(undefined),
			};

			return callback(() => mockSelect);
		});

		const resource = defineResourceWithHooks<MockThing, MockThingQuery>({
			name: 'thing',
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
			},
		});

		const { result } = renderUseListHook(resource);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeUndefined();
	});
});
function defineResourceWithHooks<T, Q>(
	config: Parameters<typeof defineResource<T, Q>>[0]
) {
	const resource = defineResource<T, Q>(config);
	attachResourceHooks(resource);
	return resource;
}
