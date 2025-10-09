import type {
	KernelInstance,
	KernelUIRuntime,
	UIIntegrationOptions,
} from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import {
	KernelEventBus,
	type ResourceDefinedEvent,
	getRegisteredResources,
} from '@geekist/wp-kernel';
import { attachUIBindings } from '../attachUIBindings';
import { attachResourceHooks } from '../../hooks/resource-hooks';

jest.mock('../../hooks/resource-hooks', () => ({
	attachResourceHooks: jest.fn((resource) => resource),
}));

jest.mock('@geekist/wp-kernel', () => {
	const actual = jest.requireActual('@geekist/wp-kernel');
	return {
		...actual,
		getRegisteredResources: jest.fn(),
	};
});

const mockAttachResourceHooks = attachResourceHooks as jest.MockedFunction<
	typeof attachResourceHooks
>;
const mockGetRegisteredResources =
	getRegisteredResources as jest.MockedFunction<
		typeof getRegisteredResources
	>;

function createReporter(): Reporter {
	const child = jest.fn();
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

function createKernel(
	events: KernelEventBus,
	options?: UIIntegrationOptions
): KernelInstance {
	const reporter = createReporter();

	const kernel: KernelInstance = {
		getNamespace: () => 'tests',
		getReporter: () => reporter,
		invalidate: jest.fn(),
		emit: jest.fn(),
		teardown: jest.fn(),
		getRegistry: () => undefined,
		hasUIRuntime: () => false,
		getUIRuntime: () => undefined,
		attachUIBindings: jest.fn(),
		ui: {
			isEnabled: () => false,
			options,
		},
		events,
		defineResource: jest.fn(),
	};

	return kernel;
}

describe('attachUIBindings', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockGetRegisteredResources.mockReturnValue([]);
		delete (
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: {
					policy?: KernelUIRuntime['policies'];
				};
			}
		).__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('attaches hooks for existing and future resources', () => {
		const events = new KernelEventBus();
		const kernel = createKernel(events);

		const resourceA = {
			name: 'posts',
			routes: { get: { path: '/posts/:id', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;
		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource: resourceA, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(kernel);

		expect(runtime.kernel).toBe(kernel);
		expect(runtime.namespace).toBe('tests');
		expect(mockAttachResourceHooks).toHaveBeenCalledWith(
			resourceA,
			runtime
		);

		const resourceB = {
			name: 'users',
			routes: { list: { path: '/users', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;

		events.emit('resource:defined', {
			resource: resourceB,
			namespace: 'tests',
		});

		expect(mockAttachResourceHooks).toHaveBeenCalledWith(
			resourceB,
			runtime
		);
	});

	it('provides runtime helpers that proxy to the kernel', () => {
		const events = new KernelEventBus();
		const kernel = createKernel(events, { suspense: true });
		const runtime = attachUIBindings(kernel, { notices: true });

		expect(runtime.options).toEqual({ notices: true });
		expect(runtime.reporter).toBe(kernel.getReporter());
		expect(runtime.registry).toBeUndefined();

		runtime.invalidate?.(['posts']);
		expect(kernel.invalidate).toHaveBeenCalledWith(['posts'], undefined);
	});

	it('lazily resolves policy runtime from global overrides', () => {
		const events = new KernelEventBus();
		const kernel = createKernel(events);
		const runtime = attachUIBindings(kernel);

		expect(runtime.policies).toBeUndefined();

		const policy = { can: jest.fn() };
		(
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { policy?: unknown };
			}
		).__WP_KERNEL_ACTION_RUNTIME__ = { policy };

		expect(runtime.policies).toEqual({ policy });
	});
});
