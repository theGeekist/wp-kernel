import type { ActionErrorEvent } from '../../actions/types';
import { KernelError } from '../../error/KernelError';
import { kernelEventsPlugin } from '../plugins/events';
import type { Reporter } from '../../reporter';
import type { KernelRegistry } from '../types';
import { KernelEventBus } from '../../events/bus';

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
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		if (hooks && hooks.doAction) {
			hooks.doAction.mockReset();
		}
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

		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		const before = hooks?.doAction?.mock.calls.length ?? 0;
		bus.emit('action:error', createActionErrorEvent());
		expect(hooks?.doAction?.mock.calls.length ?? 0).toBe(before);
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

		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		const before = hooks?.doAction?.mock.calls.length ?? 0;
		bus.emit('action:error', createActionErrorEvent());
		expect(hooks?.doAction?.mock.calls.length ?? 0).toBe(before);
	});
});
