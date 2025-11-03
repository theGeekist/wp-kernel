import { WPKernelError } from '../../error/WPKernelError';
import { createReporter } from '../../reporter';
import { wpkEventsPlugin } from '../../data/plugins/events';
import { registerWPKernelStore } from '../../data/store';
import type { WPKernelRegistry } from '../../data/types';
import type { ActionErrorEvent } from '../../actions/types';
import { WPKernelEventBus } from '../../events/bus';
import {
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '@wpkernel/test-utils/core';

function createActionErrorEvent(
	overrides: Partial<ActionErrorEvent> = {}
): ActionErrorEvent {
	return {
		phase: 'error',
		error: new WPKernelError('ValidationError', { message: 'test error' }),
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

function createRecordingHooks() {
	const recordedHooks: Record<string, unknown[]> = {};
	const actionHandlers = new Map<
		string,
		Map<string, (payload: ActionErrorEvent) => void>
	>();

	const hooks = {
		addAction: jest
			.fn()
			.mockImplementation(
				(
					hookName: string,
					namespace: string,
					handler: (payload: ActionErrorEvent) => void
				) => {
					const namespaceMap =
						actionHandlers.get(hookName) ?? new Map();
					namespaceMap.set(namespace, handler);
					actionHandlers.set(hookName, namespaceMap);
				}
			),
		removeAction: jest
			.fn()
			.mockImplementation((hookName: string, namespace: string) => {
				const namespaceMap = actionHandlers.get(hookName);
				if (!namespaceMap) {
					return;
				}
				namespaceMap.delete(namespace);
				if (namespaceMap.size === 0) {
					actionHandlers.delete(hookName);
				}
			}),
		doAction: jest
			.fn()
			.mockImplementation((hookName: string, payload: unknown) => {
				const namespaceMap = actionHandlers.get(hookName);
				if (namespaceMap) {
					namespaceMap.forEach((handler) =>
						handler(payload as ActionErrorEvent)
					);
				}
				(recordedHooks[hookName] ||= []).push(payload);
			}),
	} satisfies Partial<NonNullable<Window['wp']>['hooks']>;

	return { hooks, recordedHooks };
}

describe('Integration: Kernel error reporting flow', () => {
	let harness: WordPressTestHarness;
	let createNotice: jest.Mock;
	let recordedHooks: Record<string, unknown[]>;
	let originalConsoleError: typeof console.error;

	beforeEach(() => {
		const recording = createRecordingHooks();
		recordedHooks = recording.recordedHooks;

		harness = createWordPressTestHarness({ hooks: recording.hooks });

		const wpData = harness.data;
		createNotice = jest.fn();
		wpData.createReduxStore.mockReturnValue({
			name: 'wpk/integration-store',
		});
		wpData.dispatch.mockImplementation((storeName: string) => {
			if (storeName === 'core/notices') {
				return { createNotice };
			}
			return {};
		});

		originalConsoleError = console.error;
		console.error = jest.fn();
	});

	afterEach(() => {
		console.error = originalConsoleError;
		jest.restoreAllMocks();
		harness.teardown();
	});

	it('creates notices and reporter output when action errors are emitted', () => {
		const registry = harness.data as unknown as WPKernelRegistry;

		type IntegrationState = Record<string, never>;
		type IntegrationActions = {
			noop: () => void;
		};
		type IntegrationSelectors = {
			selectNothing: () => undefined;
		};

		registerWPKernelStore<
			'wpk/integration',
			IntegrationState,
			IntegrationActions,
			IntegrationSelectors
		>('wpk/integration', {
			reducer: jest.fn(
				(state: IntegrationState = {}, _action: unknown) => state
			),
			actions: {
				noop: jest.fn(),
			},
			selectors: {
				selectNothing: jest.fn(),
			},
		});

		const reporter = createReporter({
			namespace: 'integration',
			channel: 'all',
			level: 'info',
		});

		const bus = new WPKernelEventBus();
		const middleware = wpkEventsPlugin({
			reporter,
			registry,
			events: bus,
		});
		const next = jest.fn();
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'INIT',
		});

		const event = createActionErrorEvent({
			error: new WPKernelError('ValidationError', {
				message: 'Invalid input',
			}),
			actionName: 'SavePost',
			requestId: 'req-123',
			namespace: 'integration',
			durationMs: 42,
		});

		bus.emit('action:error', event);

		expect(createNotice).toHaveBeenCalledWith(
			'info',
			'Invalid input',
			expect.objectContaining({ id: 'req-123', isDismissible: true })
		);

		expect(console.error).toHaveBeenCalledWith(
			'[integration]',
			'Invalid input',
			expect.objectContaining({
				action: 'SavePost',
				namespace: 'integration',
				requestId: 'req-123',
				status: 'info',
			})
		);
		expect(recordedHooks['integration.reporter.error']).toEqual([
			expect.objectContaining({
				message: 'Invalid input',
				context: expect.objectContaining({ status: 'info' }),
			}),
		]);

		middleware.destroy?.();

		bus.emit('action:error', {
			...event,
			requestId: 'req-456',
		});

		expect(createNotice).toHaveBeenCalledTimes(1);
	});
});
