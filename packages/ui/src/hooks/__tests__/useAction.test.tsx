import { act } from 'react';
import { createDeferred, renderHook } from '../testing/test-utils';
import { useAction } from '../useAction';
import type { UseActionOptions, UseActionResult } from '../useAction';
import type { ActionEnvelope, DefinedAction } from '@wpkernel/core/actions';
import { KernelError } from '@wpkernel/core/error';
import * as kernelData from '@wpkernel/core/data';
import { KernelEventBus } from '@wpkernel/core/events';
import type {
	KernelUIRuntime,
	KernelRegistry,
	KernelInstance,
} from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import { KernelUIProvider } from '@wpkernel/ui';
import {
	createKernelUITestHarness,
	type KernelUITestHarness,
} from '@wpkernel/test-utils/ui';

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';

function renderUseActionHook<TInput, TResult>(
	action: DefinedAction<TInput, TResult>,
	options?: UseActionOptions<TInput, TResult>,
	runtimeOverrides?: Partial<KernelUIRuntime>
) {
	if (!harness) {
		throw new Error('Kernel UI harness not initialised');
	}
	const runtime = harness.createRuntime(runtimeOverrides ?? {});
	if (runtimeOverrides) {
		Object.assign(runtime, runtimeOverrides);
	}
	const renderResult = renderHook(() => useAction(action, options ?? {}), {
		wrapper: harness.createWrapper(runtime),
	});

	return { ...renderResult, runtime };
}

function makeDefinedAction<TInput, TResult>(
	impl: (input: TInput) => Promise<TResult> | TResult,
	name = 'test.action'
): DefinedAction<TInput, TResult> {
	const fn = jest.fn(async (input: TInput) =>
		impl(input)
	) as unknown as DefinedAction<TInput, TResult>;
	Object.defineProperty(fn, 'actionName', {
		value: name,
		writable: false,
	});
	Object.defineProperty(fn, 'options', {
		value: { scope: 'crossTab', bridged: true },
		writable: false,
	});
	return fn;
}

function prepareWpData(
	invokeImpl?: (envelope: ActionEnvelope<unknown, unknown>) => unknown
) {
	if (!harness) {
		throw new Error('Kernel UI harness not initialised');
	}

	const wpData = harness.wordpress.data;

	(wpData.createReduxStore as jest.Mock).mockReset();
	(wpData.register as jest.Mock).mockReset();
	(wpData.dispatch as jest.Mock).mockReset();

	(wpData.createReduxStore as jest.Mock).mockImplementation(() => ({
		name: ACTION_STORE_KEY,
	}));
	(wpData.register as jest.Mock).mockImplementation(() => undefined);

	const fallbackInvoke = (envelope: ActionEnvelope<unknown, unknown>) =>
		(envelope.payload.action as DefinedAction<unknown, unknown>)(
			envelope.payload.args
		);
	const invoke = jest.fn(invokeImpl ?? fallbackInvoke);

	(wpData.dispatch as jest.Mock).mockImplementation((store: string) => {
		if (store === ACTION_STORE_KEY) {
			return { invoke };
		}
		return {};
	});

	return invoke as jest.Mock;
}

let harness: KernelUITestHarness | undefined;

const noopReporter: Reporter = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	child: jest.fn(() => noopReporter),
};

type GenericUseActionResult = UseActionResult<unknown, unknown>;

interface StateMatrixCase {
	label: string;
	arrange: () => {
		action: DefinedAction<any, any>;
		options?: UseActionOptions<any, any>;
		runtimeOverrides?: Partial<KernelUIRuntime>;
		execute: (result: { current: GenericUseActionResult }) => Promise<void>;
		assert: (state: GenericUseActionResult) => void;
	};
}

describe('useAction', () => {
	beforeAll(() => {
		harness = createKernelUITestHarness({
			provider: KernelUIProvider,
		});
		harness.suppressConsoleError((args) => {
			try {
				const message = String(args[0] ?? '');
				return (
					message.includes('A store with name') &&
					message.includes('is already registered')
				);
			} catch {
				return false;
			}
		});
	});

	afterAll(() => {
		harness?.restoreConsoleError();
		harness?.teardown();
		harness = undefined;
	});

	beforeEach(() => {
		harness?.wordpress.reset();
		harness?.resetActionStoreRegistration();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const stateMatrixCases: StateMatrixCase[] = [
		{
			label: 'success after action resolves',
			arrange: () => {
				prepareWpData((envelope) =>
					envelope.payload.action(envelope.payload.args)
				);
				const payload = { id: 123 };
				const expected = { ...payload, ok: true };
				const action = makeDefinedAction(async () => expected);

				return {
					action,
					async execute(result) {
						await act(async () => {
							const response = await result.current.run(payload);
							expect(response).toEqual(expected);
						});
					},
					assert(state) {
						expect(state.status).toBe('success');
						expect(state.result).toEqual(expected);
						expect(state.error).toBeUndefined();
						expect(state.inFlight).toBe(0);
					},
				};
			},
		},
		{
			label: 'error state when action rejects with KernelError',
			arrange: () => {
				const kernelError = new KernelError('ValidationError', {
					message: 'Invalid',
				});
				prepareWpData((envelope) =>
					envelope.payload.action(envelope.payload.args)
				);
				const action = makeDefinedAction(async () => {
					throw kernelError;
				});

				return {
					action,
					async execute(result) {
						await act(async () => {
							await expect(
								result.current.run({} as never)
							).rejects.toBe(kernelError);
						});
					},
					assert(state) {
						expect(state.status).toBe('error');
						expect(state.error).toBe(kernelError);
						expect(state.result).toBeUndefined();
						expect(state.inFlight).toBe(0);
					},
				};
			},
		},
		{
			label: 'idle state after cancel clears in-flight request',
			arrange: () => {
				const deferred = createDeferred<string>();
				prepareWpData((envelope) =>
					envelope.payload.action(envelope.payload.args)
				);
				const action = makeDefinedAction(async () => deferred.promise);

				return {
					action,
					async execute(result) {
						let promise!: Promise<unknown>;
						act(() => {
							promise = result.current.run('start');
						});
						expect(result.current.status).toBe('running');

						act(() => {
							result.current.cancel();
						});

						expect(result.current.status).toBe('idle');

						await act(async () => {
							deferred.resolve('ignored');
							await promise;
						});
					},
					assert(state) {
						expect(state.status).toBe('idle');
						expect(state.result).toBeUndefined();
						expect(state.error).toBeUndefined();
						expect(state.inFlight).toBe(0);
					},
				};
			},
		},
		{
			label: 'success after reset while request resolves',
			arrange: () => {
				const deferred = createDeferred<string>();
				const finalValue = 'complete';
				prepareWpData((envelope) =>
					envelope.payload.action(envelope.payload.args)
				);
				const action = makeDefinedAction(async () => deferred.promise);

				return {
					action,
					async execute(result) {
						let promise!: Promise<unknown>;
						act(() => {
							promise = result.current.run('value');
						});

						act(() => {
							result.current.reset();
						});

						expect(result.current.status).toBe('idle');

						await act(async () => {
							deferred.resolve(finalValue);
							await promise;
						});
					},
					assert(state) {
						expect(state.status).toBe('success');
						expect(state.result).toBe(finalValue);
						expect(state.error).toBeUndefined();
						expect(state.inFlight).toBe(0);
					},
				};
			},
		},
	];

	describe('state matrix', () => {
		it.each(stateMatrixCases)('%s', async ({ arrange }) => {
			const { action, options, runtimeOverrides, execute, assert } =
				arrange();
			const { result } = renderUseActionHook(
				action,
				options,
				runtimeOverrides
			);

			await execute(result);

			assert(result.current);
		});
	});

	it('deduplicates in-flight executions when dedupeKey matches', async () => {
		const deferred = createDeferred<{ value: string }>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async () => deferred.promise);

		const { result } = renderUseActionHook(action, {
			dedupeKey: (input: string) => input,
		});

		let firstPromise!: Promise<{ value: string }>;
		let secondPromise!: Promise<{ value: string }>;
		act(() => {
			firstPromise = result.current.run('query');
		});
		act(() => {
			secondPromise = result.current.run('query');
		});

		expect(firstPromise).toBe(secondPromise);
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(result.current.inFlight).toBe(1);

		await act(async () => {
			deferred.resolve({ value: 'done' });
			await firstPromise;
		});

		expect(result.current.status).toBe('success');
		expect(result.current.result).toEqual({ value: 'done' });
		expect(result.current.inFlight).toBe(0);
	});

	it('switch concurrency cancels previous calls', async () => {
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let callCount = 0;
		const action = makeDefinedAction(async () => {
			callCount += 1;
			return callCount === 1 ? first.promise : second.promise;
		});

		const { result } = renderUseActionHook(action, {
			concurrency: 'switch',
		});

		let firstRun!: Promise<string>;
		act(() => {
			firstRun = result.current.run('one');
		});
		expect(result.current.inFlight).toBe(1);

		let secondRun!: Promise<string>;
		act(() => {
			secondRun = result.current.run('two');
		});
		expect(result.current.inFlight).toBe(1);
		expect(invoke).toHaveBeenCalledTimes(2);

		await act(async () => {
			first.resolve('first');
			second.resolve('second');
			await Promise.all([firstRun.catch(() => undefined), secondRun]);
		});

		expect(result.current.result).toBe('second');
		expect(result.current.status).toBe('success');
	});

	it('queue concurrency runs actions sequentially', async () => {
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let call = 0;
		const action = makeDefinedAction(async () => {
			call += 1;
			return call === 1 ? first.promise : second.promise;
		});

		const { result } = renderUseActionHook(action, {
			concurrency: 'queue',
		});

		let firstRun!: Promise<string>;
		let secondRun!: Promise<string>;
		act(() => {
			firstRun = result.current.run('a');
		});
		act(() => {
			secondRun = result.current.run('b');
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(invoke).toHaveBeenCalledTimes(1);

		await act(async () => {
			first.resolve('first');
			await firstRun;
		});

		expect(invoke).toHaveBeenCalledTimes(2);

		await act(async () => {
			second.resolve('second');
			await secondRun;
		});

		expect(result.current.result).toBe('second');
	});

	it('drop concurrency reuses the active promise', async () => {
		const deferred = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => deferred.promise);
		const { result } = renderUseActionHook(action, {
			concurrency: 'drop',
		});

		let first!: Promise<string>;
		let second!: Promise<string>;
		act(() => {
			first = result.current.run('payload');
		});
		act(() => {
			second = result.current.run('payload-2');
		});
		expect(first).toBe(second);
		expect(invoke).toHaveBeenCalledTimes(1);

		await act(async () => {
			deferred.resolve('done');
			await first;
		});
	});

	it('calls invalidate when autoInvalidate returns patterns', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => ({ id: 10 }));
		const patterns = [['job', 'list']];

		const { result, runtime } = renderUseActionHook(action, {
			autoInvalidate: () => patterns,
		});

		await act(async () => {
			await result.current.run({ id: 10 });
		});

		expect(runtime.invalidate).toHaveBeenCalledWith(patterns);
	});

	it('allows multiple hook instances without sharing state', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async (value: number) => value * 2);

		const { result: first } = renderUseActionHook(action, {
			concurrency: 'parallel',
		});
		const { result: second } = renderUseActionHook(action, {
			concurrency: 'parallel',
		});

		await act(async () => {
			await first.current.run(2);
		});

		expect(first.current.result).toBe(4);
		expect(second.current.result).toBeUndefined();

		await act(async () => {
			await second.current.run(3);
		});

		expect(second.current.result).toBe(6);
	});

	it('can be imported in environments without window (SSR safety)', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		const originalWindow = globalThis.window;

		if (descriptor && descriptor.configurable) {
			Object.defineProperty(globalThis, 'window', {
				configurable: true,
				value: undefined,
			});
		}

		expect(() => {
			jest.isolateModules(() => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('../useAction');
			});
		}).not.toThrow();

		if (descriptor && descriptor.configurable) {
			Object.defineProperty(globalThis, 'window', {
				...descriptor,
				value: originalWindow,
			});
		}
	});

	it('throws a KernelError when run during SSR', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		if (!descriptor?.configurable) {
			// Environment does not allow overriding window; skip assertion.
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const originalWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		const action = makeDefinedAction(async () => 'noop');
		const { result } = renderUseActionHook(action);

		expect(() => {
			result.current.run({} as never);
		}).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'useAction cannot run during SSR'
				),
			})
		);

		Object.defineProperty(globalThis, 'window', {
			...descriptor,
			value: originalWindow,
		});
	});
	it('throws when WordPress data registry dispatch API is unavailable', () => {
		const action = makeDefinedAction(async () => 'noop');
		const registry = {
			...harness!.wordpress.data,
			dispatch: jest.fn(() => ({})),
		} as unknown as KernelRegistry;

		const { result } = renderUseActionHook(action, undefined, {
			registry,
		});

		expect(() => result.current.run({} as never)).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'Failed to resolve kernel action dispatcher'
				),
			})
		);
	});

	it('ignores duplicate store registration errors', async () => {
		harness?.resetActionStoreRegistration();
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockImplementation(() => {
				throw new Error('Store already registered');
			});

		const action = makeDefinedAction(async (payload: { id: number }) => ({
			...payload,
			success: true,
		}));

		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const { result } = renderUseActionHook(action);

		await act(async () => {
			const output = await result.current.run({ id: 42 });
			expect(output).toEqual({ id: 42, success: true });
		});

		expect(registerSpy).toHaveBeenCalled();
		registerSpy.mockRestore();
	});

	it('propagates unexpected store registration errors', async () => {
		harness?.resetActionStoreRegistration();
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockImplementation(() => {
				throw new Error('Unexpected failure');
			});

		const action = makeDefinedAction(async () => 'value');
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const { result } = renderUseActionHook(action);

		expect(() => {
			result.current.run({} as never);
		}).toThrow('Unexpected failure');

		registerSpy.mockRestore();
	});

	it('normalises non-error dispatch failures into KernelError instances', async () => {
		prepareWpData(() => {
			throw 'primitive failure';
		});

		const action = makeDefinedAction(async (value: number) => value);
		const { result } = renderUseActionHook(action);
		let capturedError: unknown;
		await act(async () => {
			try {
				await result.current.run(7);
			} catch (error) {
				capturedError = error;
			}
		});

		expect(capturedError as KernelError).toMatchObject({
			name: 'KernelError',
			code: 'UnknownError',
			message: 'Dispatching action failed with non-error value',
		});
	});

	it('does not invalidate cache when autoInvalidate returns falsey values', async () => {
		harness?.resetActionStoreRegistration();
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockReturnValue({
				name: ACTION_STORE_KEY,
				instantiate: () => ({}) as any,
			} as any);

		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => ({ id: 1 }));

		const { result, runtime } = renderUseActionHook(action, {
			autoInvalidate: () => false,
		});
		await act(async () => {
			await result.current.run({ id: 1 });
		});

		expect(runtime.invalidate).not.toHaveBeenCalled();
		registerSpy.mockRestore();
	});

	it('queue concurrency respects cancellation and prevents queued calls from executing', async () => {
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		const third = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let call = 0;
		const action = makeDefinedAction(async () => {
			call += 1;
			if (call === 1) {
				return first.promise;
			}
			if (call === 2) {
				return second.promise;
			}
			return third.promise;
		});

		const { result } = renderUseActionHook(action, {
			concurrency: 'queue',
		});

		// Start first call
		let firstRun!: Promise<string>;
		act(() => {
			firstRun = result.current.run('first');
		});
		await act(async () => {
			await Promise.resolve(); // Allow state update
		});
		expect(result.current.inFlight).toBe(1);

		// Queue second and third calls
		let secondRun!: Promise<string>;
		let thirdRun!: Promise<string>;
		act(() => {
			secondRun = result.current.run('second');
			thirdRun = result.current.run('third');
		});

		// Cancel before first completes
		act(() => {
			result.current.cancel();
		});
		expect(result.current.inFlight).toBe(0);
		expect(result.current.status).toBe('idle');

		// Complete first call - it was already running so it finishes
		await act(async () => {
			first.resolve('first-value');
			await firstRun;
		});

		// Queued calls (second and third) should have been cancelled and never execute
		expect(call).toBe(1); // Only first call executed

		// Resolve the remaining deferreds to clean up
		second.resolve('second-value');
		third.resolve('third-value');

		// Ensure secondRun and thirdRun reject with cancellation error
		await expect(secondRun).rejects.toMatchObject({
			name: 'KernelError',
			code: 'DeveloperError',
			message: expect.stringContaining('cancelled'),
		});
		await expect(thirdRun).rejects.toMatchObject({
			name: 'KernelError',
			code: 'DeveloperError',
			message: expect.stringContaining('cancelled'),
		});
	});

	it('throws when WordPress data is missing entirely', () => {
		const action = makeDefinedAction(async () => 'noop');
		const { result } = renderUseActionHook(action, undefined, {
			registry: undefined,
			kernel: undefined,
		});

		expect(() => result.current.run({} as never)).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'useAction requires the WordPress data registry'
				),
			})
		);
	});

	it('handles Error instances in normaliseToKernelError', async () => {
		const consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		const regularError = new Error('Regular error message');
		prepareWpData(() => {
			throw regularError;
		});

		const action = makeDefinedAction(async () => 'value');
		const { result } = renderUseActionHook(action);

		await act(async () => {
			try {
				await result.current.run({} as never);
			} catch (error) {
				expect(error).toMatchObject({
					name: 'KernelError',
					message: expect.stringContaining('Regular error message'),
				});
			}
		});

		expect(result.current.status).toBe('error');
		consoleErrorSpy.mockRestore();
	});

	it('autoInvalidate returns false to skip invalidation', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => ({ id: 10 }));
		const kernelInvalidate = jest.fn();
		const kernelStub = {
			invalidate: kernelInvalidate,
			getNamespace: () => 'tests',
			getReporter: () => noopReporter,
			emit: jest.fn(),
			teardown: jest.fn(),
			getRegistry: () =>
				globalThis.window?.wp?.data as KernelRegistry | undefined,
			hasUIRuntime: () => true,
			getUIRuntime: () => undefined,
			attachUIBindings: jest.fn(),
			ui: { isEnabled: () => true, options: undefined },
			events: new KernelEventBus(),
		} as unknown as KernelInstance;

		const { result } = renderUseActionHook(
			action,
			{
				autoInvalidate: () => false,
			},
			{ invalidate: undefined, kernel: kernelStub }
		);

		await act(async () => {
			await result.current.run({ id: 10 });
		});

		expect(kernelInvalidate).not.toHaveBeenCalled();
	});

	it('registers invoke action for the kernel store', async () => {
		harness?.resetActionStoreRegistration();
		let registeredInvoke:
			| ((envelope: ActionEnvelope<any, any>) => ActionEnvelope<any, any>)
			| null = null;
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockImplementation((name, definition) => {
				registeredInvoke = (
					definition.actions as {
						invoke: (
							envelope: ActionEnvelope<any, any>
						) => ActionEnvelope<any, any>;
					}
				).invoke;
				return {
					name,
					instantiate: () => ({}) as never,
				} as never;
			});

		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async (input: { value: number }) => ({
			doubled: input.value * 2,
		}));

		const { result } = renderUseActionHook(action);

		await act(async () => {
			await result.current.run({ value: 5 });
		});

		expect(registerSpy).toHaveBeenCalled();
		if (!registeredInvoke) {
			throw new Error('Expected action store registration.');
		}
		const invoke = registeredInvoke as (
			envelope: ActionEnvelope<any, any>
		) => ActionEnvelope<any, any>;
		expect(typeof invoke).toBe('function');

		const envelope = {
			payload: { action, args: { value: 7 } },
		} as unknown as ActionEnvelope<unknown, unknown>;

		expect(invoke(envelope)).toBe(envelope);

		expect(result.current.result).toEqual({ doubled: 10 });
		registerSpy.mockRestore();
	});

	it('cancels active deduped requests and clears the dedupe map', async () => {
		harness?.resetActionStoreRegistration();
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let call = 0;
		const action = makeDefinedAction(async () => {
			call += 1;
			return call === 1 ? first.promise : second.promise;
		});

		const { result } = renderUseActionHook(action, {
			dedupeKey: () => 'static-key',
		});

		act(() => {
			result.current.run('first');
		});

		act(() => {
			result.current.cancel();
		});

		await act(async () => {
			await Promise.resolve();
		});

		let rerun!: Promise<string>;
		act(() => {
			rerun = result.current.run('second');
		});

		expect(call).toBe(2);
		first.resolve('ignored');

		await act(async () => {
			second.resolve('second-value');
			await rerun;
		});

		expect(result.current.result).toBe('second-value');
	});

	it('falls back to kernel.invalidate when runtime invalidate is unavailable', async () => {
		harness?.resetActionStoreRegistration();
		const invalidate = jest.fn();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async () => ({ id: 1 }));
		const kernelInstance = {
			invalidate: invalidate as KernelInstance['invalidate'],
		} as KernelInstance;

		const { result, runtime } = renderUseActionHook(
			action,
			{
				autoInvalidate: () => [['resource']],
			},
			{ kernel: kernelInstance }
		);

		runtime.invalidate = undefined as unknown as typeof runtime.invalidate;
		runtime.kernel = kernelInstance;

		await act(async () => {
			await result.current.run({} as never);
		});

		expect(invalidate).toHaveBeenCalledWith([['resource']]);
	});

	it('throws a descriptive error when queued calls are cancelled before execution', async () => {
		harness?.resetActionStoreRegistration();
		const first = createDeferred<void>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let call = 0;
		const action = makeDefinedAction(async () => {
			call += 1;
			if (call === 1) {
				return first.promise;
			}
			return 'done';
		});

		const { result } = renderUseActionHook(action, {
			concurrency: 'queue',
		});

		let firstRun!: Promise<unknown>;
		act(() => {
			firstRun = result.current.run('initial');
		});

		await act(async () => {
			await Promise.resolve();
		});

		let queuedRun!: Promise<unknown>;
		act(() => {
			queuedRun = result.current.run('queued');
		});

		act(() => {
			result.current.cancel();
		});

		await act(async () => {
			first.resolve();
			await firstRun.catch(() => undefined);
		});

		await expect(queuedRun).rejects.toMatchObject({
			message:
				'Queued action cancelled before execution in queue concurrency mode',
		});
	});
});
