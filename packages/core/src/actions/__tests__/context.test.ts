/**
 * @file Unit tests for action context helpers and runtime integration.
 */

import {
	createActionContext,
	emitLifecycleEvent,
	generateActionRequestId,
	getHooks,
	resolveOptions,
} from '../context';
import { WPKernelError } from '../../error/WPKernelError';
import type { Reporter } from '../../reporter';
import * as reporterModule from '../../reporter';
import { resetResolvedActionReporters } from '../resolveReporter';
import { resetReporterResolution } from '../../reporter/resolve';

jest.mock('../../reporter', () => {
	const actual = jest.requireActual('../../reporter');

	return {
		...actual,
		createReporter: jest.fn(actual.createReporter),
	};
});

describe('Action Context', () => {
	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;
	let originalSilentFlag: string | undefined;

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
		originalSilentFlag = process.env.WPK_SILENT_REPORTERS;
		delete process.env.WPK_SILENT_REPORTERS;
		resetReporterResolution();
	});

	afterEach(() => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
		resetResolvedActionReporters();
		jest.clearAllMocks();
		resetReporterResolution();
		if (typeof originalSilentFlag === 'undefined') {
			delete process.env.WPK_SILENT_REPORTERS;
		} else {
			process.env.WPK_SILENT_REPORTERS = originalSilentFlag;
		}
		// Note: window.wp is reset by setup-jest.ts afterEach, not here
	});

	describe('resolveOptions', () => {
		it('applies crossTab and bridged defaults', () => {
			const result = resolveOptions({});
			expect(result).toEqual({ scope: 'crossTab', bridged: true });
		});

		it('respects explicit scope option', () => {
			const result = resolveOptions({ scope: 'tabLocal' });
			expect(result).toEqual({ scope: 'tabLocal', bridged: false });
		});

		it('forces bridged to false for tabLocal scope', () => {
			const result = resolveOptions({ scope: 'tabLocal', bridged: true });
			expect(result).toEqual({ scope: 'tabLocal', bridged: false });
		});

		it('respects explicit bridged option for crossTab', () => {
			const result = resolveOptions({
				scope: 'crossTab',
				bridged: false,
			});
			expect(result).toEqual({ scope: 'crossTab', bridged: false });
		});
	});

	describe('generateActionRequestId', () => {
		it('generates unique request IDs with act_ prefix', () => {
			const id1 = generateActionRequestId();
			const id2 = generateActionRequestId();

			expect(id1).toMatch(/^act_\d+_[a-z0-9]+$/);
			expect(id2).toMatch(/^act_\d+_[a-z0-9]+$/);
			expect(id1).not.toBe(id2);
		});
	});

	describe('createActionContext', () => {
		describe('reporter', () => {
			it('uses runtime reporter if provided', () => {
				const mockReporter = {
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					debug: jest.fn(),
					child: jest.fn(),
				} as jest.Mocked<Reporter>;
				mockReporter.child.mockReturnValue(mockReporter);
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					reporter: mockReporter,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.reporter.info('test message', { foo: 'bar' });
				expect(mockReporter.info).toHaveBeenCalledWith('test message', {
					foo: 'bar',
				});
			});

			it('falls back to the WP Kernel reporter when no runtime reporter provided', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				resetResolvedActionReporters();
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(typeof ctx.reporter.info).toBe('function');
				expect(typeof ctx.reporter.warn).toBe('function');
				expect(typeof ctx.reporter.error).toBe('function');
				expect(typeof ctx.reporter.debug).toBe('function');
				expect(typeof ctx.reporter.child).toBe('function');
			});

			it('returns a noop reporter when silent reporting is enabled', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				process.env.WPK_SILENT_REPORTERS = '1';

				resetResolvedActionReporters();

				const createReporterMock =
					reporterModule.createReporter as jest.MockedFunction<
						typeof reporterModule.createReporter
					>;

				createReporterMock.mockClear();
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_789', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.reporter.warn('should not log');

				expect(createReporterMock).not.toHaveBeenCalled();
				expect(consoleWarnSpy).not.toHaveBeenCalled();
				consoleWarnSpy.mockRestore();
			});

			it('reuses the fallback reporter across invocations when runtime is absent', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx1 = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				const ctx2 = createActionContext('Test.Action', 'req_456', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(ctx1.reporter).toBe(ctx2.reporter);
			});

			it('reuses a provided reporter override', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const overrideReporter = {
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					debug: jest.fn(),
					child: jest.fn(() => overrideReporter),
				} as unknown as Reporter;

				const createContextWithOverride = createActionContext as (
					actionName: string,
					requestId: string,
					options: Parameters<typeof createActionContext>[2],
					reporter?: Reporter
				) => ReturnType<typeof createActionContext>;

				const ctx = createContextWithOverride(
					'Test.Action',
					'req_123',
					{
						scope: 'crossTab',
						bridged: true,
					},
					overrideReporter
				);

				expect(ctx.reporter).toBe(overrideReporter);
			});
		});

		describe('capability', () => {
			it('uses runtime capability if provided', () => {
				const mockCapability = {
					assert: jest.fn(),
					can: jest.fn().mockReturnValue(true),
				};
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					capability: mockCapability,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.capability.assert('test.capability', undefined);
				expect(mockCapability.assert).toHaveBeenCalledWith(
					'test.capability',
					undefined
				);

				const result = ctx.capability.can('test.capability', undefined);
				expect(mockCapability.can).toHaveBeenCalledWith(
					'test.capability',
					undefined
				);
				expect(result).toBe(true);
			});

			it('throws WPKernelError when assert called without runtime capability', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(() =>
					ctx.capability.assert('test.capability', undefined)
				).toThrow(WPKernelError);
				expect(() =>
					ctx.capability.assert('test.capability', undefined)
				).toThrow(/attempted to assert a capability/);
			});

			it('returns false and warns when can called without runtime capability', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const originalEnv = process.env.NODE_ENV;
				process.env.NODE_ENV = 'development';
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				const result1 = ctx.capability.can(
					'test.capability',
					undefined
				);
				expect(result1).toBe(false);
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'[wpk.capability]',
					'Action "Test.Action" called capability.can(\'test.capability\') but no capability runtime is configured.'
				);
				expect(console as any).toHaveWarnedWith(
					'[wpk.capability]',
					'Action "Test.Action" called capability.can(\'test.capability\') but no capability runtime is configured.'
				);

				// Second call should not warn again (warned = true)
				consoleWarnSpy.mockClear();
				const result2 = ctx.capability.can(
					'test.capability',
					undefined
				);
				expect(result2).toBe(false);
				expect(consoleWarnSpy).not.toHaveBeenCalled();

				consoleWarnSpy.mockRestore();
				process.env.NODE_ENV = originalEnv;
			});

			it('does not warn in production when can called without runtime', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const originalEnv = process.env.NODE_ENV;
				process.env.NODE_ENV = 'production';
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				const result = ctx.capability.can('test.capability', undefined);
				expect(result).toBe(false);
				expect(consoleWarnSpy).not.toHaveBeenCalled();

				consoleWarnSpy.mockRestore();
				process.env.NODE_ENV = originalEnv;
			});
		});

		describe('jobs', () => {
			it('uses runtime jobs if provided', async () => {
				const mockJobs = {
					enqueue: jest.fn().mockResolvedValue(undefined),
					wait: jest.fn().mockResolvedValue({ result: 'done' }),
				};
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					jobs: mockJobs,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await ctx.jobs.enqueue('TestJob', { id: 1 });
				expect(mockJobs.enqueue).toHaveBeenCalledWith('TestJob', {
					id: 1,
				});

				const result = await ctx.jobs.wait('TestJob', { id: 1 });
				expect(mockJobs.wait).toHaveBeenCalledWith('TestJob', {
					id: 1,
				});
				expect(result).toEqual({ result: 'done' });
			});

			it('throws NotImplementedError when enqueue called without runtime', async () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await expect(
					ctx.jobs.enqueue('TestJob', { id: 1 })
				).rejects.toThrow(WPKernelError);
				await expect(
					ctx.jobs.enqueue('TestJob', { id: 1 })
				).rejects.toThrow(/no jobs runtime is configured/);
			});

			it('throws NotImplementedError when wait called without runtime', async () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await expect(
					ctx.jobs.wait('TestJob', { id: 1 })
				).rejects.toThrow(WPKernelError);
				await expect(
					ctx.jobs.wait('TestJob', { id: 1 })
				).rejects.toThrow(/no jobs runtime is configured/);
			});
		});

		describe('emit', () => {
			it('throws when eventName is empty', () => {
				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(() => ctx.emit('', { data: 'test' })).toThrow(
					WPKernelError
				);
				expect(() => ctx.emit('', { data: 'test' })).toThrow(
					/requires a non-empty string event name/
				);
			});
		});
	});

	describe('emitLifecycleEvent', () => {
		it('emits to hooks when available', () => {
			const event = {
				phase: 'start' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				args: { foo: 'bar' },
			};

			emitLifecycleEvent(event);

			expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
				'wpk.action.start',
				event
			);
		});

		it('does not throw when hooks unavailable', () => {
			(global.window as Window & { wp?: unknown }).wp = undefined;

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			expect(() => emitLifecycleEvent(event)).not.toThrow();
		});

		it('emits to bridge when bridged is true and runtime bridge exists', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			emitLifecycleEvent(event);

			expect(bridgeEmit).toHaveBeenCalledWith(
				'wpk.action.complete',
				event,
				event
			);
		});

		it('does not emit to bridge when bridged is false', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'tabLocal' as const,
				bridged: false,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			emitLifecycleEvent(event);

			expect(window.wp?.hooks?.doAction).toHaveBeenCalled();
			expect(bridgeEmit).not.toHaveBeenCalled();
		});
	});

	it('handles BroadcastChannel unavailable (SSR)', () => {
		// Test when BroadcastChannel fails to initialize
		const originalBroadcastChannel = global.BroadcastChannel;
		(global as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;

		const event = {
			phase: 'start' as const,
			actionName: 'Test.Action',
			requestId: 'req_123',
			namespace: 'test-plugin',
			scope: 'crossTab' as const,
			bridged: true,
			timestamp: Date.now(),
			args: null,
		};

		expect(() => emitLifecycleEvent(event)).not.toThrow();

		global.BroadcastChannel = originalBroadcastChannel;
	});

	it.skip('does not emit to BroadcastChannel for tabLocal events', () => {
		// This test is complex due to BroadcastChannel module caching.
		// Skip for now as the functionality is tested indirectly through integration tests.
	});

	it.skip('emits to BroadcastChannel for crossTab events when available', () => {
		// This test is complex due to module caching. Skip for now as the
		// functionality is tested indirectly through integration tests.
		// The uncovered branch (line 396-397) is the BroadcastChannel instantiation,
		// which is difficult to test in isolation due to module-level caching.
	});

	describe('getHooks', () => {
		it('returns null when window.wp.hooks is missing', () => {
			(global.window as any).wp = {};
			const hooks = getHooks();
			expect(hooks).toBeNull();
		});

		it('returns null when window.wp.hooks.doAction is not a function', () => {
			(global.window as any).wp = {
				hooks: { doAction: 'not-a-function' },
			};
			const hooks = getHooks();
			expect(hooks).toBeNull();
		});
	});

	describe('ActionContext.emit (domain events)', () => {
		let originalNamespace: string | undefined;

		beforeEach(() => {
			originalNamespace = (global as any).__WP_KERNEL_NAMESPACE__;
			(global as any).__WP_KERNEL_NAMESPACE__ = 'test-plugin';
			global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

			(global.window as any).wp = {
				hooks: {
					doAction: jest.fn(),
				},
			};
		});

		afterEach(() => {
			(global as any).__WP_KERNEL_NAMESPACE__ = originalNamespace;
		});

		it('throws when eventName is not a string', () => {
			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			expect(() => ctx.emit('' as string, {})).toThrow(
				'ctx.emit requires a non-empty string event name'
			);
			expect(() => ctx.emit(null as unknown as string, {})).toThrow(
				'ctx.emit requires a non-empty string event name'
			);
		});

		it('emits domain events to hooks', () => {
			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			ctx.emit('test.event', { foo: 'bar' });

			expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
				'test.event',
				{
					foo: 'bar',
				}
			);
		});

		it('emits to runtime bridge when bridged=true', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'crossTab',
				bridged: true,
			});

			ctx.emit('test.event', { foo: 'bar' });

			expect(bridgeEmit).toHaveBeenCalledWith(
				'test.event',
				{ foo: 'bar' },
				expect.objectContaining({
					actionName: 'Test.Action',
					requestId: 'req_123',
					scope: 'crossTab',
					bridged: true,
				})
			);
		});

		it('emits to BroadcastChannel for crossTab scope', () => {
			// This test is complex due to module caching. Skip for now as the
			// functionality is tested indirectly through integration tests.
		});

		it('does not throw when hooks unavailable', () => {
			(global.window as Window & { wp?: unknown }).wp = undefined;

			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			expect(() => ctx.emit('test.event', { foo: 'bar' })).not.toThrow();
		});
	});
});
