import { configureKernel } from '../configure-kernel';
import { createReporter } from '../../reporter';
import type { Reporter } from '../../reporter';
import { invalidate as invalidateCache } from '../../resource/cache';
import { KernelError } from '../../error/KernelError';
import type { KernelRegistry, KernelUIRuntime } from '../types';
import {
	KernelEventBus,
	getKernelEventBus,
	setKernelEventBus,
} from '../../events/bus';
import { createActionMiddleware } from '../../actions/middleware';
import { kernelEventsPlugin } from '../plugins/events';
import { getNamespace as detectNamespace } from '../../namespace/detect';

jest.mock('../../actions/middleware', () => ({
	createActionMiddleware: jest.fn(() =>
		jest.fn(() => jest.fn((action) => action))
	),
}));

jest.mock('../../reporter', () => ({
	createReporter: jest.fn(),
	setKernelReporter: jest.fn(),
	getKernelReporter: jest.fn(() => undefined),
	clearKernelReporter: jest.fn(),
}));

jest.mock('../plugins/events', () => ({
	kernelEventsPlugin: jest.fn(() => ({ destroy: jest.fn() })),
}));

jest.mock('../../resource/cache', () => ({
	invalidate: jest.fn(),
}));

jest.mock('../../namespace/detect', () => ({
	getNamespace: jest.fn(() => 'detected.namespace'),
}));

type Middleware = ReturnType<typeof createActionMiddleware>;

describe('configureKernel', () => {
	const actionMiddleware: Middleware = jest
		.fn()
		.mockImplementation((next) => (action: unknown) => next(action));
	let mockReporter: jest.Mocked<Reporter>;
	const eventMiddleware = { destroy: jest.fn() };

	function createMockReporter(): jest.Mocked<Reporter> {
		const child = jest.fn<Reporter, [string]>();
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

	beforeEach(() => {
		jest.clearAllMocks();
		mockReporter = createMockReporter();
		(createActionMiddleware as jest.Mock).mockReturnValue(actionMiddleware);
		(createReporter as jest.Mock).mockReturnValue(mockReporter);
		(kernelEventsPlugin as jest.Mock).mockReturnValue(eventMiddleware);
		(invalidateCache as jest.Mock).mockImplementation(() => undefined);
		globalThis.getWPData = jest.fn();
		setKernelEventBus(new KernelEventBus());
	});

	afterEach(() => {
		(actionMiddleware as jest.Mock).mockReset();
		eventMiddleware.destroy.mockReset();
	});

	it('installs middleware on the provided registry and cleans up on teardown', () => {
		const detachActions = jest.fn();
		const detachEvents = jest.fn();
		const customMiddleware = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const kernel = configureKernel({
			namespace: 'acme',
			registry,
			middleware: [customMiddleware],
			reporter: mockReporter,
		});

		expect(registry.__experimentalUseMiddleware).toHaveBeenCalledTimes(2);
		const [actionFactory] =
			registry.__experimentalUseMiddleware.mock.calls[0];
		const [eventsFactory] =
			registry.__experimentalUseMiddleware.mock.calls[1];

		expect(typeof actionFactory).toBe('function');
		expect(typeof eventsFactory).toBe('function');
		const installedActions = actionFactory();
		expect(installedActions).toEqual([actionMiddleware, customMiddleware]);

		const [installedEvents] = eventsFactory();
		expect(installedEvents).toBe(eventMiddleware);

		kernel.teardown();
		expect(detachActions).toHaveBeenCalled();
		expect(detachEvents).toHaveBeenCalled();
		expect(eventMiddleware.destroy).toHaveBeenCalled();
	});

	it('handles registries without middleware support gracefully', () => {
		const registry = {
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const kernel = configureKernel({ namespace: 'acme', registry });

		expect(
			(registry as { __experimentalUseMiddleware?: unknown })
				.__experimentalUseMiddleware
		).toBeUndefined();

		expect(() => kernel.teardown()).not.toThrow();
	});

	it('falls back to global registry when not provided', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		(globalThis.getWPData as jest.Mock).mockReturnValue(registry);

		configureKernel({ namespace: 'acme' });

		expect(globalThis.getWPData).toHaveBeenCalled();
		expect(registry.__experimentalUseMiddleware).toHaveBeenCalled();
	});

	it('handles missing global registry helpers gracefully', () => {
		delete (globalThis as { getWPData?: unknown }).getWPData;

		const kernel = configureKernel({ namespace: 'acme' });

		expect(kernel.getRegistry()).toBeUndefined();
	});

	it('delegates invalidate calls to resource cache with registry context', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const kernel = configureKernel({ namespace: 'acme', registry });
		const patterns = ['post', 'list'];

		kernel.invalidate(patterns);
		expect(invalidateCache).toHaveBeenCalledWith(
			patterns,
			expect.objectContaining({
				registry,
				namespace: 'acme',
				reporter: expect.objectContaining({
					child: expect.any(Function),
				}),
			})
		);

		kernel.invalidate(patterns, { emitEvent: false });
		expect(invalidateCache).toHaveBeenCalledWith(
			patterns,
			expect.objectContaining({
				emitEvent: false,
				registry,
				namespace: 'acme',
				reporter: expect.objectContaining({
					child: expect.any(Function),
				}),
			})
		);
	});

	it('emits custom events through the event bus', () => {
		const kernel = configureKernel({ namespace: 'acme' });
		const payload = { foo: 'bar' };
		const bus = getKernelEventBus();
		const emitSpy = jest.spyOn(bus, 'emit');

		kernel.emit('wpk.event', payload);

		expect(emitSpy).toHaveBeenCalledWith('custom:event', {
			eventName: 'wpk.event',
			payload,
		});
	});

	it('throws KernelError when emit is called with invalid event name', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		expect(() => kernel.emit('', {})).toThrow(KernelError);
	});

	it('reports UI disabled state by default', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		expect(kernel.ui.isEnabled()).toBe(false);
	});

	it('attaches UI runtime when adapter is provided', () => {
		const runtime: KernelUIRuntime = {
			namespace: 'acme',
			reporter: mockReporter,
			registry: undefined,
			events: new KernelEventBus(),
			invalidate: jest.fn(),
			options: undefined,
		};
		const attach = jest.fn(() => runtime);

		const kernel = configureKernel({
			namespace: 'acme',
			ui: { attach },
		});

		expect(attach).toHaveBeenCalledWith(kernel, undefined);
		expect(kernel.hasUIRuntime()).toBe(true);
		expect(kernel.getUIRuntime()).toBe(runtime);
		expect(kernel.ui.isEnabled()).toBe(true);
	});

	it('allows manual UI runtime attachment', () => {
		const runtime: KernelUIRuntime = {
			namespace: 'acme',
			reporter: mockReporter,
			registry: undefined,
			events: new KernelEventBus(),
			invalidate: jest.fn(),
			options: undefined,
		};
		const attach = jest.fn(() => runtime);

		const kernel = configureKernel({ namespace: 'acme' });

		expect(kernel.hasUIRuntime()).toBe(false);

		const attached = kernel.attachUIBindings(attach);

		expect(attach).toHaveBeenCalledWith(kernel, undefined);
		expect(attached).toBe(runtime);
		expect(kernel.getUIRuntime()).toBe(runtime);
		expect(kernel.ui.isEnabled()).toBe(true);
	});

	it('exposes the shared event bus on the kernel instance', () => {
		const kernel = configureKernel({ namespace: 'acme' });
		const bus = getKernelEventBus();

		expect(kernel.events).toBe(bus);
	});

	it('exposes namespace, reporter, and registry accessors', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const kernel = configureKernel({
			namespace: 'acme',
			registry,
			reporter: mockReporter,
		});

		expect(kernel.getNamespace()).toBe('acme');
		expect(kernel.getReporter()).toBe(mockReporter);
		expect(kernel.getRegistry()).toBe(registry);
	});

	it('falls back to detected namespace when none is provided', () => {
		const detectNamespaceMock = detectNamespace as jest.MockedFunction<
			typeof detectNamespace
		>;
		detectNamespaceMock.mockReturnValueOnce('fallback.namespace');

		const kernel = configureKernel();

		expect(detectNamespaceMock).toHaveBeenCalled();
		expect(kernel.getNamespace()).toBe('fallback.namespace');
	});

	it('handles middleware hooks that do not return teardown callbacks', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce(undefined),
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		(kernelEventsPlugin as jest.Mock).mockReturnValueOnce({});

		const kernel = configureKernel({ namespace: 'acme', registry });

		expect(() => kernel.teardown()).not.toThrow();
	});

	it('normalizes teardown errors that are not Error instances', () => {
		const detachActions = jest.fn(() => {
			throw 'cleanup-failed';
		});
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(() => undefined),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		try {
			const kernel = configureKernel({ namespace: 'acme', registry });

			kernel.teardown();

			expect(mockReporter.error).toHaveBeenCalledWith(
				'Kernel teardown failed',
				expect.any(Error)
			);
			const errorArg = mockReporter.error.mock.calls.pop()?.[1];
			expect(errorArg).toBeInstanceOf(Error);
			expect((errorArg as Error).message).toBe('cleanup-failed');
		} finally {
			process.env.NODE_ENV = originalEnv;
		}
	});

	it('reports errors thrown during teardown cleanup', () => {
		const detachActions = jest.fn(() => {
			throw new Error('cleanup failed');
		});
		const detachEvents = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		try {
			const kernel = configureKernel({
				namespace: 'acme',
				registry,
				reporter: mockReporter,
			});

			kernel.teardown();

			expect(mockReporter.error).toHaveBeenCalledWith(
				'Kernel teardown failed',
				expect.any(Error)
			);
		} finally {
			process.env.NODE_ENV = originalEnv;
		}
	});

	it('defines resources using kernel reporter namespace', () => {
		const childReporter = createMockReporter();
		mockReporter.child.mockReturnValue(childReporter);

		const kernel = configureKernel({
			namespace: 'acme',
			reporter: mockReporter,
		});

		const resource = kernel.defineResource<{ id: number }>({
			name: 'thing',
			routes: {
				get: { path: '/acme/v1/things/:id', method: 'GET' },
			},
		});

		expect(mockReporter.child).toHaveBeenCalledWith('resource.thing');
		expect(resource.reporter).toBe(childReporter);
		expect(resource.storeKey).toBe('acme/thing');
	});

	it('respects custom resource reporters when provided', () => {
		const kernel = configureKernel({ namespace: 'acme' });
		const customReporter = createMockReporter();

		const resource = kernel.defineResource<{ id: number }>({
			name: 'thing',
			reporter: customReporter,
			routes: {
				list: { path: '/acme/v1/things', method: 'GET' },
			},
		});

		expect(resource.reporter).toBe(customReporter);
		expect(resource.routes.list).toBeDefined();
	});

	it('preserves explicit resource namespaces supplied in config', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		const resource = kernel.defineResource<{ id: number }>({
			name: 'thing',
			namespace: 'custom',
			routes: {
				get: { path: '/custom/v1/things/:id', method: 'GET' },
			},
		});

		expect(resource.storeKey).toBe('custom/thing');
		expect(resource.events?.created).toBe('custom.thing.created');
	});

	it('respects namespace embedded within resource name shorthand', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		const resource = kernel.defineResource<{ id: number }>({
			name: 'custom:thing',
			routes: {
				get: { path: '/custom/v1/things/:id', method: 'GET' },
			},
		});

		expect(resource.storeKey).toBe('custom/thing');
		expect(resource.events?.updated).toBe('custom.thing.updated');
	});

	it('prefers explicit namespace when provided alongside shorthand name syntax', () => {
		const kernel = configureKernel({ namespace: 'acme' });

		const resource = kernel.defineResource<{ id: number }>({
			name: 'custom:thing',
			namespace: 'custom-explicit',
			routes: {
				create: {
					path: '/custom-explicit/v1/things',
					method: 'POST',
				},
			},
		});

		expect(resource.storeKey).toBe('custom-explicit/thing');
		expect(resource.events?.created).toBe('custom-explicit.thing.created');
	});
});
