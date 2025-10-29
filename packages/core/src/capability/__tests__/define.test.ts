import { defineCapability } from '../define';
import { createCapabilityProxy } from '../context';
import type {
	CapabilityDefinitionConfig,
	CapabilityHelpers,
	CapabilityMap,
	CapabilityOptions,
	CapabilityRule,
} from '../types';
import { WPKernelError } from '../../error/WPKernelError';
import { CapabilityDeniedError } from '../../error/CapabilityDeniedError';

function createCapability<K extends Record<string, unknown>>(
	map: CapabilityMap<K>,
	options?: CapabilityOptions
) {
	return defineCapability<K>({ map, options });
}

describe('capability module', () => {
	beforeAll(() => {
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
	});

	afterAll(() => {
		delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
	});

	beforeEach(() => {
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	afterEach(() => {
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('throws DeveloperError when config is missing', () => {
		expect(() =>
			defineCapability(
				undefined as unknown as CapabilityDefinitionConfig<
					Record<string, unknown>
				>
			)
		).toThrow(
			'defineCapability requires a configuration object with "map".'
		);
	});

	it('throws DeveloperError when map is invalid', () => {
		expect(() =>
			defineCapability<{ foo: void }>({
				map: undefined as unknown as CapabilityMap<{ foo: void }>,
			})
		).toThrow('defineCapability requires a "map" of capability rules.');
	});

	it('evaluates synchronous capabilities', () => {
		const capability = createCapability<{
			'tasks.manage': void;
			'tasks.delete': void;
		}>({
			'tasks.manage': () => true,
			'tasks.delete': () => false,
		});

		expect(capability.can('tasks.manage')).toBe(true);
		expect(capability.can('tasks.delete')).toBe(false);
	});

	it('caches asynchronous evaluations', async () => {
		let hits = 0;
		const capability = createCapability<{
			'tasks.async': void;
		}>({
			'tasks.async': async () => {
				hits += 1;
				return hits < 2;
			},
		});

		const first = await capability.can('tasks.async');
		expect(first).toBe(true);
		const second = await capability.can('tasks.async');
		expect(second).toBe(true);
		expect(hits).toBe(1);
	});

	it('throws WPKernelError with messageKey and emits events when denied', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		expect(hooks?.doAction).toBeDefined();
		const doAction = hooks!.doAction!;
		doAction.mockImplementation(() => undefined);

		const capability = createCapability<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		);

		expect(() => capability.assert('tasks.manage')).toThrow(
			CapabilityDeniedError
		);
		try {
			capability.assert('tasks.manage');
		} catch (error) {
			const err = error as CapabilityDeniedError;
			expect(err.code).toBe('CapabilityDenied');
			expect(err.messageKey).toBe('capability.denied.acme.tasks.manage');
		}

		expect(doAction).toHaveBeenCalledWith(
			'acme.capability.denied',
			expect.objectContaining({
				capabilityKey: 'tasks.manage',
				messageKey: 'capability.denied.acme.tasks.manage',
			})
		);
	});

	it('extend overrides rules and invalidates cache', async () => {
		const capability = createCapability<{
			'tasks.manage': void;
		}>({
			'tasks.manage': async () => true,
		});

		await expect(capability.can('tasks.manage')).resolves.toBe(true);
		expect(capability.cache.get('tasks.manage::void')).toBe(true);

		const warn = jest.spyOn(console, 'warn').mockImplementation();
		capability.extend({
			'tasks.manage': async () => false,
		});
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();

		expect(capability.cache.get('tasks.manage::void')).toBeUndefined();
		await expect(capability.can('tasks.manage')).resolves.toBe(false);
	});

	it('proxy injects request context for action assertions', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		expect(hooks?.doAction).toBeDefined();
		const doAction = hooks!.doAction!;
		doAction.mockImplementation(() => undefined);

		const capability = createCapability<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		) as CapabilityHelpers<Record<string, unknown>>;

		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			capability,
			bridge: {
				emit: jest.fn(),
			},
		};
		const bridgeEmit = (
			global.__WP_KERNEL_ACTION_RUNTIME__ as {
				bridge: { emit: jest.Mock };
			}
		).bridge.emit;

		const proxy = createCapabilityProxy({
			actionName: 'Task.Update',
			requestId: 'req-1',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
		});

		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			WPKernelError
		);
		expect(doAction).toHaveBeenCalledWith(
			'acme.capability.denied',
			expect.objectContaining({
				requestId: 'req-1',
			})
		);
		expect(bridgeEmit).toHaveBeenCalledWith(
			'acme.bridge.capability.denied',
			expect.objectContaining({ capabilityKey: 'tasks.manage' }),
			expect.objectContaining({ requestId: 'req-1' })
		);
	});

	it('throws a developer error when accessing unknown capability keys', () => {
		const capability = createCapability<{ 'tasks.manage': void }>({
			'tasks.manage': () => true,
		});

		expect(() => capability.can('tasks.delete' as never)).toThrow(
			WPKernelError
		);
	});

	it('reuses in-flight promises for async capability evaluations', async () => {
		let resolveFn: ((value: boolean) => void) | undefined;
		const asyncRule = jest.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolveFn = resolve;
				})
		);
		const capability = createCapability<{ 'tasks.async': void }>({
			'tasks.async': asyncRule,
		});

		const first = capability.can('tasks.async');
		const second = capability.can('tasks.async');
		expect(first).toBe(second);
		resolveFn?.(true);
		await expect(first).resolves.toBe(true);
		expect(asyncRule).toHaveBeenCalledTimes(1);
	});

	it('clears in-flight cache when async rules reject', async () => {
		const asyncRule = jest
			.fn<Promise<boolean>, Parameters<CapabilityRule<void>>>()
			.mockRejectedValueOnce(new Error('fail'))
			.mockResolvedValueOnce(true);

		const capability = createCapability<{ 'tasks.async': void }>({
			'tasks.async': asyncRule,
		});

		await expect(capability.can('tasks.async')).rejects.toThrow('fail');
		await expect(capability.can('tasks.async')).resolves.toBe(true);
		expect(asyncRule).toHaveBeenCalledTimes(2);
	});
});
