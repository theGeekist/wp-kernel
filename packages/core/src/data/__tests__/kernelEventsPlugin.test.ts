import type {
	ActionErrorEvent,
	ActionCompleteEvent,
	ActionStartEvent,
} from '../../actions/types';
import { KernelError } from '../../error/KernelError';
import { kernelEventsPlugin } from '../plugins/events';
import type { Reporter } from '../../reporter';
import type { KernelRegistry } from '../types';
import { KernelEventBus } from '../../events/bus';
import { WPK_EVENTS } from '../../namespace/constants';

type WordPressHooks = {
	doAction: jest.Mock;
	addAction: jest.Mock;
	removeAction: jest.Mock;
};

type WordPressWindow = typeof window & {
	wp?: {
		hooks: WordPressHooks;
	};
};

function createRegistryMock(): KernelRegistry & { createNotice: jest.Mock } {
	const createNotice = jest.fn();
	const dispatch = jest.fn().mockReturnValue({ createNotice });
	return {
		dispatch,
		createNotice,
	} as unknown as KernelRegistry & { createNotice: jest.Mock };
}

function createActionErrorEvent(
	overrides: Partial<ActionErrorEvent> = {}
): ActionErrorEvent {
	return {
		phase: 'error',
		error: new KernelError('ValidationError', { message: 'test error' }),
		actionName: 'TestAction',
		requestId: 'test-req-id',
		namespace: 'test',
		durationMs: 10,
		scope: 'crossTab',
		bridged: false,
		timestamp: Date.now(),
		...overrides,
	};
}

describe('kernelEventsPlugin', () => {
	beforeEach(() => {
		const wpGlobal = window as WordPressWindow;
		wpGlobal.wp = {
			hooks: {
				doAction: jest.fn(),
				addAction: jest.fn(),
				removeAction: jest.fn(),
			},
		} as WordPressWindow['wp'];
	});

	it('dispatches notices, reports errors, bridges to hooks, and maps statuses', () => {
		const registry = createRegistryMock();
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({
			reporter,
			registry,
			events: bus,
		});

		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		// Generic error → error notice
		bus.emit('action:error', {
			error: new Error('Network failed'),
			actionName: 'CreatePost',
			requestId: 'act_error',
			namespace: 'acme',
			phase: 'error',
			durationMs: 25,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(registry.createNotice).toHaveBeenNthCalledWith(
			1,
			'error',
			'Network failed',
			expect.objectContaining({ id: 'act_error', isDismissible: true })
		);
		expect(reporter.error).toHaveBeenCalledWith('Network failed', {
			action: 'CreatePost',
			namespace: 'acme',
			requestId: 'act_error',
			status: 'error',
		});
		expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({ requestId: 'act_error' })
		);

		// Policy denied → warning notice
		bus.emit(
			'action:error',
			createActionErrorEvent({
				error: new KernelError('PolicyDenied', { message: 'denied' }),
				actionName: 'CheckPolicy',
				requestId: 'act_warning',
				namespace: 'acme',
				bridged: true,
			})
		);
		expect(registry.createNotice).toHaveBeenNthCalledWith(
			2,
			'warning',
			'denied',
			expect.objectContaining({ id: 'act_warning' })
		);

		// Validation error → info notice
		bus.emit(
			'action:error',
			createActionErrorEvent({
				error: new KernelError('ValidationError', {
					message: 'invalid',
				}),
				actionName: 'Validate',
				requestId: 'act_info',
				namespace: 'acme',
				bridged: true,
			})
		);
		expect(registry.createNotice).toHaveBeenNthCalledWith(
			3,
			'info',
			'invalid',
			expect.objectContaining({ id: 'act_info' })
		);

		// Non-error value → normalized to error notice
		bus.emit('action:error', {
			error: 'string failure',
			actionName: 'StringError',
			requestId: 'act_string',
			namespace: 'acme',
			phase: 'error',
			durationMs: 5,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);
		expect(registry.createNotice).toHaveBeenNthCalledWith(
			4,
			'error',
			'string failure',
			expect.objectContaining({ id: 'act_string' })
		);

		middleware.destroy?.();

		const hooks = (window as WordPressWindow).wp?.hooks;
		const before = hooks?.doAction.mock.calls.length ?? 0;
		bus.emit('action:error', createActionErrorEvent());
		expect(hooks?.doAction.mock.calls.length ?? 0).toBe(before);
	});

	it('bridges lifecycle and custom events to WordPress hooks', () => {
		const registry = createRegistryMock();
		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({
			registry,
			events: bus,
		});

		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		const hooks = (window as WordPressWindow).wp?.hooks;
		hooks?.doAction.mockClear();

		const startEvent: ActionStartEvent = {
			phase: 'start',
			args: ['input'],
			actionName: 'DemoAction',
			requestId: 'start-1',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: false,
			timestamp: Date.now(),
		};

		const completeEvent: ActionCompleteEvent = {
			phase: 'complete',
			result: { success: true },
			durationMs: 42,
			actionName: 'DemoAction',
			requestId: 'complete-1',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		};

		bus.emit('action:start', startEvent);
		bus.emit('action:complete', completeEvent);
		bus.emit('cache:invalidated', { keys: ['list'], storeKey: 'posts' });
		bus.emit('action:domain', {
			eventName: 'acme.action.event',
			payload: { foo: 'bar' },
			metadata: startEvent,
		});
		bus.emit('custom:event', {
			eventName: 'acme.custom.event',
			payload: { fizz: 'buzz' },
		});

		expect(hooks?.doAction).toHaveBeenNthCalledWith(
			1,
			WPK_EVENTS.ACTION_START,
			startEvent
		);
		expect(hooks?.doAction).toHaveBeenNthCalledWith(
			2,
			WPK_EVENTS.ACTION_COMPLETE,
			completeEvent
		);
		expect(hooks?.doAction).toHaveBeenNthCalledWith(
			3,
			WPK_EVENTS.CACHE_INVALIDATED,
			expect.objectContaining({ keys: ['list'] })
		);
		expect(hooks?.doAction).toHaveBeenNthCalledWith(
			4,
			'acme.action.event',
			{ foo: 'bar' }
		);
		expect(hooks?.doAction).toHaveBeenNthCalledWith(
			5,
			'acme.custom.event',
			{ fizz: 'buzz' }
		);
	});

	it('removes listeners when destroy is called', () => {
		const registry = createRegistryMock();
		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({ registry, events: bus });
		const next = jest.fn();
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'IGNORE',
		});

		middleware.destroy?.();

		const hooks = (window as WordPressWindow).wp?.hooks;
		const before = hooks?.doAction.mock.calls.length ?? 0;
		bus.emit('action:error', createActionErrorEvent());
		expect(hooks?.doAction.mock.calls.length ?? 0).toBe(before);
	});

	it('gracefully handles registries without dispatch helpers', () => {
		const registry = {} as unknown as KernelRegistry;
		const reporter = {
			error: jest.fn(),
			child: jest.fn().mockReturnThis(),
		} as unknown as jest.Mocked<Reporter>;

		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({
			registry,
			reporter,
			events: bus,
		});

		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		expect(() =>
			bus.emit('action:error', createActionErrorEvent())
		).not.toThrow();
		expect(reporter.error).toHaveBeenCalled();
	});

	it('ignores registries that do not expose createNotice()', () => {
		const registry = {
			dispatch: jest.fn().mockReturnValue({}),
		} as unknown as KernelRegistry;

		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({ registry, events: bus });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		expect(() =>
			bus.emit('action:error', createActionErrorEvent())
		).not.toThrow();
	});

	it('swallows dispatch errors when notices store fails', () => {
		const registry = {
			dispatch: jest.fn(() => {
				throw new Error('registry failure');
			}),
		} as unknown as KernelRegistry;

		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({ registry, events: bus });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		expect(() =>
			bus.emit('action:error', createActionErrorEvent())
		).not.toThrow();
	});

	it('falls back to a default error message for unexpected values', () => {
		const registry = createRegistryMock();
		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({ registry, events: bus });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		const errorEvent = createActionErrorEvent({ error: 42 });
		bus.emit('action:error', errorEvent);

		expect(registry.createNotice).toHaveBeenCalledWith(
			'error',
			'An unexpected error occurred',
			expect.objectContaining({ id: errorEvent.requestId })
		);
	});

	it('maps unknown KernelError codes to error notices', () => {
		const registry = createRegistryMock();
		const bus = new KernelEventBus();
		const middleware = kernelEventsPlugin({ registry, events: bus });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'INIT',
		});

		const kernelError = new KernelError('ServerError', {
			message: 'Internal failure',
		});
		const event = createActionErrorEvent({
			error: kernelError,
			requestId: 'server-failure',
		});

		bus.emit('action:error', event);

		expect(registry.createNotice).toHaveBeenCalledWith(
			'error',
			'Internal failure',
			expect.objectContaining({ id: 'server-failure' })
		);
	});

	it('skips hook bridging when WordPress hooks are unavailable', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);

		if (!descriptor?.configurable) {
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		try {
			const registry = createRegistryMock();
			const bus = new KernelEventBus();
			const middleware = kernelEventsPlugin({
				registry,
				events: bus,
			});

			middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())(
				{
					type: 'INIT',
				}
			);

			const startEvent: ActionStartEvent = {
				phase: 'start',
				args: [],
				actionName: 'noop',
				requestId: 'start',
				namespace: 'acme',
				scope: 'crossTab',
				bridged: false,
				timestamp: Date.now(),
			};

			expect(() => bus.emit('action:start', startEvent)).not.toThrow();
		} finally {
			Object.defineProperty(globalThis, 'window', descriptor!);
		}
	});
});
