import React, { act, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { usePolicy } from '../usePolicy';
import { KernelUIProvider } from '../../runtime';
import type { KernelUIRuntime } from '@geekist/wp-kernel/data';
import { KernelEventBus } from '@geekist/wp-kernel';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import {
	createPolicyCache,
	createPolicyCacheKey,
} from '@geekist/wp-kernel/policy';
import type { PolicyHelpers, UsePolicyResult } from '@geekist/wp-kernel/policy';
import { KernelError } from '@geekist/wp-kernel/error';

jest.mock('@geekist/wp-kernel/namespace', () => ({
	getNamespace: () => 'acme',
}));

type RuntimePolicy =
	| PolicyHelpers<Record<string, unknown>>
	| (Partial<PolicyHelpers<Record<string, unknown>>> & {
			cache?: PolicyHelpers<Record<string, unknown>>['cache'];
	  });

const noopReporter: Reporter = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	child: jest.fn(),
};

function createRuntime(policy?: RuntimePolicy): KernelUIRuntime {
	return {
		namespace: 'acme',
		reporter: noopReporter,
		registry: undefined,
		events: new KernelEventBus(),
		policies: policy ? { policy } : undefined,
	};
}

describe('usePolicy hook (UI integration)', () => {
	beforeAll(() => {
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
	});

	afterAll(() => {
		delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function renderTestComponent<Policy extends Record<string, unknown>>(
		results: UsePolicyResult<Policy>[],
		runtime: KernelUIRuntime
	) {
		const container = document.createElement('div');
		const root = createRoot(container);

		function TestComponent() {
			const value = usePolicy<Policy>();
			const initial = useRef(true);
			if (initial.current) {
				results.push(value);
				initial.current = false;
			}
			useEffect(() => {
				results.push(value);
			}, [value]);
			return null;
		}

		act(() => {
			root.render(
				React.createElement(KernelUIProvider, {
					runtime,
					children: React.createElement(TestComponent),
				})
			);
		});

		return {
			container,
			cleanup() {
				act(() => {
					root.unmount();
				});
			},
		};
	}

	it('throws a developer error when no runtime is configured', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		function TestComponent() {
			usePolicy<Record<string, never>>();
			return null;
		}

		try {
			expect(() => {
				act(() => {
					root.render(React.createElement(TestComponent));
				});
			}).toThrow(
				expect.objectContaining({
					name: 'KernelError',
					code: 'DeveloperError',
				})
			);
		} finally {
			act(() => {
				root.unmount();
			});
			consoleErrorSpy.mockRestore();
		}
	});

	it('returns cached values without calling runtime can()', async () => {
		const cache = createPolicyCache({ crossTab: false }, 'acme');
		const cacheKey = createPolicyCacheKey('tasks.manage', undefined);
		cache.set(cacheKey, true, {
			source: 'remote',
			expiresAt: Date.now() + 1000,
		});
		const runtimeCan = jest.fn().mockReturnValue(false);
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache,
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		expect(latest.isLoading).toBe(false);
		expect(latest.can('tasks.manage', undefined)).toBe(true);
		expect(runtimeCan).not.toHaveBeenCalled();
		expect(latest.keys).toEqual(['tasks.manage']);
		cleanup();
	});

	it('captures async denials from runtime can()', async () => {
		const runtimeCan = jest.fn(() => Promise.reject('nope'));
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		await act(async () => {
			latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});

		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(Error);
		expect((final.error as Error).message).toBe('nope');
		cleanup();
	});

	it('records thrown errors from runtime can()', async () => {
		const runtimeCan = jest.fn(() => {
			throw new KernelError('PolicyDenied', { message: 'denied' });
		});
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		let allowed: boolean | undefined;
		await act(async () => {
			allowed = latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});
		expect(allowed).toBe(false);
		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(KernelError);
		expect((final.error as KernelError).code).toBe('PolicyDenied');
		cleanup();
	});

	it('coerces non-error throws from runtime can()', async () => {
		const runtimeCan = jest.fn(() => {
			throw 'denied';
		});
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		let allowed: boolean | undefined;
		await act(async () => {
			allowed = latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});
		expect(allowed).toBe(false);
		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(Error);
		expect((final.error as Error).message).toBe('denied');
		cleanup();
	});

	it('handles promise rejection with non-Error values', async () => {
		const runtimeCan = jest.fn(() => Promise.reject('rejected-string'));
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		await act(async () => {
			latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});

		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(Error);
		expect((final.error as Error).message).toBe('rejected-string');
		cleanup();
	});

	it('handles Error rejection from runtime can()', async () => {
		const errorInstance = new Error('Custom error message');
		const runtimeCan = jest.fn(() => Promise.reject(errorInstance));
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		await act(async () => {
			latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});

		const final = results[results.length - 1]!;
		expect(final.error).toBe(errorInstance);
		expect((final.error as Error).message).toBe('Custom error message');
		cleanup();
	});

	it('handles successful policy check with context', async () => {
		const cache = createPolicyCache({ crossTab: false }, 'acme');
		const runtimeCan = jest
			.fn()
			.mockImplementation(
				(key: string, ctx?: Record<string, unknown>) => {
					if (key === 'tasks.edit' && ctx?.id === 123) {
						return true; // Return synchronously, not as promise
					}
					return false;
				}
			);
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.edit'],
			cache,
		};
		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(
			results,
			createRuntime(runtime)
		);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		let allowed: boolean | undefined;
		await act(async () => {
			allowed = latest.can('tasks.edit', { id: 123 });
			await Promise.resolve();
		});

		expect(allowed).toBe(true);
		expect(runtimeCan).toHaveBeenCalledWith('tasks.edit', { id: 123 });
		cleanup();
	});
});
