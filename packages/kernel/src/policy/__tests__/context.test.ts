import {
	createPolicyProxy,
	getPolicyRequestContext,
	getPolicyRuntime,
	withPolicyRequestContext,
} from '../context';
import { KernelError } from '../../error/KernelError';
import type { ActionRuntime } from '../../actions/types';

describe('policy context', () => {
	const baseOptions = {
		actionName: 'Task.Update',
		requestId: 'req-1',
		namespace: 'acme',
		scope: 'crossTab' as const,
		bridged: false,
	};

	afterEach(() => {
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		jest.restoreAllMocks();
	});

	it('tracks request context across synchronous execution', () => {
		const result = withPolicyRequestContext(baseOptions, () => {
			expect(getPolicyRequestContext()).toEqual(baseOptions);
			return 'done';
		});

		expect(result).toBe('done');
		expect(getPolicyRequestContext()).toBeUndefined();
	});

	it('restores request context after async resolution and rejection', async () => {
		await withPolicyRequestContext(baseOptions, async () => {
			expect(getPolicyRequestContext()).toEqual(baseOptions);
		});
		expect(getPolicyRequestContext()).toBeUndefined();

		await expect(
			withPolicyRequestContext(baseOptions, async () => {
				throw new Error('fail');
			})
		).rejects.toThrow('fail');
		expect(getPolicyRequestContext()).toBeUndefined();
	});

	it('returns configured policy runtime', () => {
		const runtime: ActionRuntime = { policy: { can: jest.fn() } };
		global.__WP_KERNEL_ACTION_RUNTIME__ = runtime;
		expect(getPolicyRuntime()).toBe(runtime);
	});

	it('throws when no runtime policy is configured for assert', () => {
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		const proxy = createPolicyProxy(baseOptions);
		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			KernelError
		);
	});

	it('forwards assertions to runtime and exposes request context', () => {
		const assert = jest.fn(() => {
			expect(getPolicyRequestContext()).toEqual(baseOptions);
		});
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { assert },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		proxy.assert('tasks.manage', { id: 1 });
		expect(assert).toHaveBeenCalledWith('tasks.manage', { id: 1 });
	});

	it('passes undefined to runtime assert when no params are supplied', () => {
		const assert = jest.fn();
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { assert },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		proxy.assert('tasks.manage', undefined);
		expect(assert).toHaveBeenCalledWith('tasks.manage', undefined);
	});

	it('falls back to can() when assert is unavailable', async () => {
		const can = jest
			.fn()
			.mockReturnValueOnce(false)
			.mockResolvedValueOnce(false);
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { can },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);

		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			KernelError
		);
		await expect(proxy.assert('tasks.manage', undefined)).rejects.toThrow(
			KernelError
		);
		expect(can).toHaveBeenCalledTimes(2);
	});

	it('resolves when fallback can() returns true', () => {
		const can = jest.fn().mockReturnValue(true);
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { can },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		expect(() => proxy.assert('tasks.manage', undefined)).not.toThrow();
	});

	it('throws developer error when runtime lacks assertion surface', () => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = { policy: {} } as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			'does not expose assert()'
		);
	});

	it('warns once when calling can() without runtime', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		const proxy = createPolicyProxy(baseOptions);
		expect(proxy.can('tasks.manage', undefined)).toBe(false);
		expect(proxy.can('tasks.manage', undefined)).toBe(false);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('delegates can() calls with parameters to the runtime', () => {
		const can = jest.fn((_: string, value?: unknown) => value === true);
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { can },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		expect(proxy.can('tasks.manage', true)).toBe(true);
		expect(can).toHaveBeenCalledWith('tasks.manage', true);
	});

	it('delegates can() calls without parameters to the runtime', () => {
		const can = jest.fn(() => true);
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: { can },
		} as ActionRuntime;
		const proxy = createPolicyProxy(baseOptions);
		expect(proxy.can('tasks.manage', undefined)).toBe(true);
		expect(can).toHaveBeenCalledWith('tasks.manage', undefined);
	});
});
