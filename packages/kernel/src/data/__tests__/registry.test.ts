import { withKernel } from '../registry';
import type { KernelRegistry } from '@geekist/wp-kernel/data';
import {
	getKernelEventBus,
	KernelEventBus,
	setKernelEventBus,
} from '../../events/bus';

describe('withKernel (data registry integration)', () => {
	beforeEach(() => {
		setKernelEventBus(new KernelEventBus());
		// Reset the global mocks that are already set up by setup-jest.ts
		if (window.wp?.hooks) {
			(window.wp.hooks.addAction as jest.Mock).mockReset();
			(window.wp.hooks.removeAction as jest.Mock).mockReset();
			(window.wp.hooks.doAction as jest.Mock).mockReset();
		}
	});

	it('installs kernel middleware and returns cleanup handler', () => {
		const detachAction = jest.fn();
		const detachEvents = jest.fn();
		const createNotice = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachAction)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		// Create a proper Reporter mock that matches the Reporter interface
		const mockReporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(function (this: any) {
				return this;
			}),
		};

		// Create a proper ReduxMiddleware mock
		const customMiddleware =
			(_store: unknown) =>
			(next: (action: unknown) => unknown) =>
			(action: unknown) =>
				next(action);
		const cleanup = withKernel(registry, {
			reporter: mockReporter,
			middleware: [customMiddleware],
			namespace: 'acme',
		});

		expect(registry.__experimentalUseMiddleware).toHaveBeenCalledTimes(2);

		const actionMiddlewareFactory =
			registry.__experimentalUseMiddleware.mock.calls[0][0];
		const middlewares = actionMiddlewareFactory();
		expect(Array.isArray(middlewares)).toBe(true);
		expect(middlewares).toHaveLength(2);
		expect(middlewares[1]).toBe(customMiddleware);

		const eventsMiddlewareFactory =
			registry.__experimentalUseMiddleware.mock.calls[1][0];
		const [eventsMiddleware] = eventsMiddlewareFactory();
		const next = jest.fn();
		eventsMiddleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'PING',
		});

		const bus = getKernelEventBus();
		bus.emit('action:error', {
			phase: 'error',
			actionName: 'Test',
			requestId: 'act_123',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
			error: new Error('boom'),
			durationMs: 10,
		});

		expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({ actionName: 'Test' })
		);
		expect(createNotice).toHaveBeenCalledWith(
			'error',
			'boom',
			expect.objectContaining({ id: 'act_123' })
		);

		cleanup();

		expect(detachAction).toHaveBeenCalled();
		expect(detachEvents).toHaveBeenCalled();
		const doActionCalls = (window.wp?.hooks?.doAction as jest.Mock).mock
			.calls.length;
		bus.emit('action:error', {
			phase: 'error',
			actionName: 'Test',
			requestId: 'act_123',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
			error: new Error('boom'),
			durationMs: 10,
		});
		expect(window.wp?.hooks?.doAction).toHaveBeenCalledTimes(doActionCalls);
	});

	it('returns noop when registry does not support middleware', () => {
		const registry = {} as unknown as KernelRegistry;

		const cleanup = withKernel(registry);
		expect(cleanup()).toBeUndefined();
	});

	it('handles missing applyMiddleware function gracefully', () => {
		const registry = {
			__experimentalUseMiddleware: null,
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const cleanup = withKernel(registry);
		expect(cleanup()).toBeUndefined();
	});

	it('handles non-function applyMiddleware', () => {
		const registry = {
			__experimentalUseMiddleware: 'not-a-function',
			dispatch: jest.fn(),
		} as unknown as KernelRegistry;

		const cleanup = withKernel(registry);
		expect(cleanup()).toBeUndefined();
	});

	it('cleans up middleware when cleanup is called', () => {
		const detachAction = jest.fn();
		const detachEvents = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachAction)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const mockReporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(function (this: any) {
				return this;
			}),
		};

		const cleanup = withKernel(registry, {
			reporter: mockReporter,
			namespace: 'test',
		});

		// Call cleanup
		cleanup();

		// Verify both detach functions were called
		expect(detachAction).toHaveBeenCalledTimes(1);
		expect(detachEvents).toHaveBeenCalledTimes(1);
	});

	it('handles cleanup with no middleware registered', () => {
		const registry = {
			__experimentalUseMiddleware: jest.fn().mockReturnValue(() => {}),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const cleanup = withKernel(registry);

		// Should not throw
		expect(() => cleanup()).not.toThrow();
	});
});
