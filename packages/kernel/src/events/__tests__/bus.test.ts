import type { Reporter } from '../../reporter';
import {
	KernelEventBus,
	clearRegisteredActions,
	clearRegisteredResources,
	getRegisteredActions,
	getRegisteredResources,
	recordActionDefined,
	recordResourceDefined,
} from '../bus';
import { createReporter } from '../../reporter';

jest.mock('../../reporter', () => {
	const createMockReporter = () => {
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);
		return reporter;
	};

	return {
		createReporter: jest.fn(() => createMockReporter()),
	};
});

const mockCreateReporter = createReporter as jest.MockedFunction<
	typeof createReporter
>;
const originalEnv = process.env.NODE_ENV;

describe('KernelEventBus', () => {
	beforeEach(() => {
		clearRegisteredResources();
		clearRegisteredActions();
		mockCreateReporter.mockClear();
		process.env.NODE_ENV = originalEnv;
	});

	it('emits events to registered listeners', () => {
		const bus = new KernelEventBus();
		const listener = jest.fn();

		bus.on('custom:event', listener);
		bus.emit('custom:event', {
			eventName: 'example',
			payload: { foo: 'bar' },
		});

		expect(listener).toHaveBeenCalledWith({
			eventName: 'example',
			payload: { foo: 'bar' },
		});
	});

	it('records resource definitions for replay', () => {
		const resource = {
			name: 'demo',
			routes: {},
		} as unknown as Parameters<typeof recordResourceDefined>[0]['resource'];

		recordResourceDefined({ resource, namespace: 'tests' });

		expect(getRegisteredResources()).toEqual([
			{ resource, namespace: 'tests' },
		]);

		clearRegisteredResources();
		expect(getRegisteredResources()).toHaveLength(0);
	});

	it('records action definitions for replay', () => {
		const action = jest.fn() as unknown as Parameters<
			typeof recordActionDefined
		>[0]['action'];

		recordActionDefined({ action, namespace: 'tests' });

		expect(getRegisteredActions()).toEqual([
			{ action, namespace: 'tests' },
		]);

		clearRegisteredActions();
		expect(getRegisteredActions()).toHaveLength(0);
	});

	it('short-circuits when emitting with no listeners', () => {
		const bus = new KernelEventBus();

		expect(() =>
			bus.emit('custom:event', {
				eventName: 'noop',
				payload: {},
			})
		).not.toThrow();

		const reporter = mockCreateReporter.mock.results[0]
			?.value as jest.Mocked<Reporter>;
		expect(reporter?.error).not.toHaveBeenCalled();
	});

	it('reports listener failures outside production environments', () => {
		process.env.NODE_ENV = 'development';
		const bus = new KernelEventBus();
		const reporter = mockCreateReporter.mock.results[0]
			?.value as jest.Mocked<Reporter>;

		const failingListener = jest.fn(() => {
			throw new Error('listener failed');
		});
		const succeedingListener = jest.fn();

		bus.on('custom:event', failingListener);
		bus.on('custom:event', succeedingListener);

		expect(() =>
			bus.emit('custom:event', {
				eventName: 'wpk.test',
				payload: { value: 1 },
			})
		).not.toThrow();

		expect(succeedingListener).toHaveBeenCalled();
		expect(reporter?.error).toHaveBeenCalledWith(
			'KernelEventBus listener failed',
			expect.objectContaining({ event: 'custom:event' })
		);
	});

	it('suppresses listener errors in production', () => {
		process.env.NODE_ENV = 'production';
		const bus = new KernelEventBus();
		const reporter = mockCreateReporter.mock.results[0]
			?.value as jest.Mocked<Reporter>;

		bus.on('custom:event', () => {
			throw new Error('listener failed');
		});

		expect(() =>
			bus.emit('custom:event', {
				eventName: 'wpk.test',
				payload: null,
			})
		).not.toThrow();

		expect(reporter?.error).not.toHaveBeenCalled();
	});
});
