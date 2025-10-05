import { createRoot } from 'react-dom/client';
import React, { act, useEffect, useRef } from 'react';
import { definePolicy } from '../define';
import { usePolicy } from '../hooks';
import { createPolicyProxy } from '../context';
import type { PolicyHelpers, UsePolicyResult } from '../types';
import { KernelError } from '../../error/KernelError';

describe('policy module', () => {
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
		(
			global as { BroadcastChannel?: typeof BroadcastChannel }
		).BroadcastChannel = class {
			public messages: unknown[] = [];
			public constructor(public name: string) {}
			postMessage(message: unknown) {
				this.messages.push(message);
			}
			close() {}
		} as unknown as typeof BroadcastChannel;
	});

	afterEach(() => {
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
		delete (global as { BroadcastChannel?: typeof BroadcastChannel })
			.BroadcastChannel;
		delete (window as typeof window & { wp?: unknown }).wp;
	});

	it('evaluates synchronous policies', () => {
		const policy = definePolicy<{
			'tasks.manage': void;
			'tasks.delete': void;
		}>({
			'tasks.manage': () => true,
			'tasks.delete': () => false,
		});

		expect(policy.can('tasks.manage')).toBe(true);
		expect(policy.can('tasks.delete')).toBe(false);
	});

	it('caches asynchronous evaluations', async () => {
		let hits = 0;
		const policy = definePolicy<{
			'tasks.async': void;
		}>({
			'tasks.async': async () => {
				hits += 1;
				return hits < 2;
			},
		});

		const first = await policy.can('tasks.async');
		expect(first).toBe(true);
		const second = await policy.can('tasks.async');
		expect(second).toBe(true);
		expect(hits).toBe(1);
	});

	it('throws KernelError with messageKey and emits events when denied', async () => {
		const doAction = jest.fn();
		const hooks = {
			doAction,
		} as unknown as typeof import('@wordpress/hooks') & {
			doAction: typeof doAction;
		};

		(
			window as typeof window & {
				wp?: { hooks?: typeof hooks };
			}
		).wp = {
			hooks,
		};

		const policy = definePolicy<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		);

		expect(() => policy.assert('tasks.manage')).toThrow(KernelError);
		try {
			policy.assert('tasks.manage');
		} catch (error) {
			const err = error as KernelError & { messageKey?: string };
			expect(err.code).toBe('PolicyDenied');
			expect(err.messageKey).toBe('policy.denied.acme.tasks.manage');
		}

		expect(doAction).toHaveBeenCalledWith(
			'acme.policy.denied',
			expect.objectContaining({
				policyKey: 'tasks.manage',
				messageKey: 'policy.denied.acme.tasks.manage',
			})
		);
	});

	it('extend overrides rules and invalidates cache', async () => {
		const policy = definePolicy<{
			'tasks.manage': void;
		}>({
			'tasks.manage': async () => true,
		});

		await expect(policy.can('tasks.manage')).resolves.toBe(true);
		expect(policy.cache.get('tasks.manage::void')).toBe(true);

		const warn = jest.spyOn(console, 'warn').mockImplementation();
		policy.extend({
			'tasks.manage': async () => false,
		});
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();

		expect(policy.cache.get('tasks.manage::void')).toBeUndefined();
		await expect(policy.can('tasks.manage')).resolves.toBe(false);
	});

	it('usePolicy exposes pre-hydration contract', async () => {
		definePolicy<{
			'tasks.manage': void;
		}>({
			'tasks.manage': () => true,
		});

		type TestPolicy = { 'tasks.manage': void };
		const results: UsePolicyResult<TestPolicy>[] = [];

		function TestComponent() {
			const value = usePolicy<TestPolicy>();
			const first = useRef(true);
			useEffect(() => {
				results.push(value);
				if (first.current) {
					first.current = false;
				}
			}, [value]);
			return null;
		}

		const container = document.createElement('div');
		let root: ReturnType<typeof createRoot> | undefined;
		act(() => {
			root = createRoot(container);
			root.render(React.createElement(TestComponent));
		});

		await act(async () => {
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 0);
			});
		});

		const initial = results[0]!;
		expect(initial.isLoading).toBe(true);
		expect(initial.can('tasks.manage')).toBe(false);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		expect(latest.isLoading).toBe(false);
		expect(latest.can('tasks.manage')).toBe(true);
		act(() => {
			root?.unmount();
		});
	});

	it('proxy injects request context for action assertions', async () => {
		const doAction = jest.fn();
		const hooks = {
			doAction,
		} as unknown as typeof import('@wordpress/hooks') & {
			doAction: typeof doAction;
		};

		(
			window as typeof window & {
				wp?: { hooks?: typeof hooks };
			}
		).wp = {
			hooks,
		};

		const policy = definePolicy<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		) as PolicyHelpers<Record<string, unknown>>;

		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy,
			bridge: {
				emit: jest.fn(),
			},
		};
		const bridgeEmit = (
			global.__WP_KERNEL_ACTION_RUNTIME__ as {
				bridge: { emit: jest.Mock };
			}
		).bridge.emit;

		const proxy = createPolicyProxy({
			actionName: 'Task.Update',
			requestId: 'req-1',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
		});

		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			KernelError
		);
		expect(doAction).toHaveBeenCalledWith(
			'acme.policy.denied',
			expect.objectContaining({
				requestId: 'req-1',
			})
		);
		expect(bridgeEmit).toHaveBeenCalledWith(
			'acme.bridge.policy.denied',
			expect.objectContaining({ policyKey: 'tasks.manage' }),
			expect.objectContaining({ requestId: 'req-1' })
		);
	});
});
