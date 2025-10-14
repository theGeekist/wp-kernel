import { act, type ReactNode } from 'react';
import { createDeferred, renderHook } from '../testing/test-utils';
import { useAction } from '../useAction';
import type { UseActionOptions } from '../useAction';
import type { ActionEnvelope, DefinedAction } from '@geekist/wp-kernel/actions';
import { KernelError } from '@geekist/wp-kernel/error';
import { KernelEventBus } from '@geekist/wp-kernel/events';
import * as kernelData from '@geekist/wp-kernel/data';
import { KernelUIProvider } from '../../runtime';
import type {
	KernelUIRuntime,
	KernelRegistry,
	KernelInstance,
} from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';

const noopReporter: Reporter = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	child: jest.fn(),
};

function createRuntime(
	overrides: Partial<KernelUIRuntime> = {}
): KernelUIRuntime {
	return {
		namespace: 'tests',
		reporter: overrides.reporter ?? noopReporter,
		registry:
			overrides.registry ??
			(globalThis.window?.wp?.data as KernelRegistry | undefined) ??
			undefined,
		events: overrides.events ?? new KernelEventBus(),
		invalidate: overrides.invalidate ?? jest.fn(),
		kernel: overrides.kernel,
		policies: overrides.policies,
		options: overrides.options,
	};
}

function createWrapper(runtime: KernelUIRuntime) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<KernelUIProvider runtime={runtime}>{children}</KernelUIProvider>
		);
	};
}

function renderUseActionHook<TInput, TResult>(
	action: DefinedAction<TInput, TResult>,
	options?: UseActionOptions<TInput, TResult>,
	runtimeOverrides?: Partial<KernelUIRuntime>
) {
	const runtime = createRuntime(runtimeOverrides ?? {});
	const renderResult = renderHook(() => useAction(action, options ?? {}), {
		wrapper: createWrapper(runtime),
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
	const wpData = window.wp?.data;
	if (!wpData) {
		throw new Error('wp.data stub not initialised');
	}

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

function resetActionStoreMarker() {
	const marker = Symbol.for('wpKernelUIActionStoreRegistered');
	if (window.wp?.data) {
		delete (window.wp.data as { [key: symbol]: unknown })[marker];
	}
}

describe('useAction', () => {
	// Suppress WordPress data store "already registered" console errors which
	// are logged by @wordpress/data before it throws. Tests intentionally
	// re-register the same store key and we only want to silence the known
	// message to avoid noisy test output.
	let originalConsoleError: (message?: any, ...optionalParams: any[]) => void;

	beforeAll(() => {
		originalConsoleError = console.error;
		console.error = (...args: unknown[]) => {
			try {
				const msg = String(args[0] ?? '');
				if (
					msg.includes('A store with name') &&
					msg.includes('is already registered')
				) {
					// Known WP data registration message — ignore
					return;
				}
			} catch {
				// fallthrough to original handler
			}
			return originalConsoleError(...(args as [any, ...any[]]));
		};
	});

	afterAll(() => {
		console.error = originalConsoleError;
	});
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('executes actions and updates state on success', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async (input: { id: number }) => ({
			...input,
			ok: true,
		}));

		const { result } = renderUseActionHook(action);

		await act(async () => {
			const payload = { id: 123 };
			const response = await result.current.run(payload);
			expect(response).toEqual({ id: 123, ok: true });
		});

		expect(result.current.status).toBe('success');
		expect(result.current.result).toEqual({ id: 123, ok: true });
		expect(result.current.inFlight).toBe(0);
	});

	it('records errors and exposes KernelError state', async () => {
		const kernelError = new KernelError('ValidationError', {
			message: 'Invalid',
		});
		prepareWpData((envelope) =>
			envelope.payload
				.action(envelope.payload.args)
				.then((_value: unknown) => {
					throw kernelError;
				})
		);

		const action = makeDefinedAction(async () => {
			return Promise.reject(kernelError);
		});

		const { result } = renderUseActionHook(action);

		await act(async () => {
			await expect(result.current.run({})).rejects.toBe(kernelError);
		});

		expect(result.current.status).toBe('error');
		expect(result.current.error).toBe(kernelError);
		expect(result.current.inFlight).toBe(0);
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

	it('cancels local state tracking when cancel() is called', async () => {
		const deferred = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async () => deferred.promise);
		const { result } = renderUseActionHook(action);

		let promise!: Promise<string>;
		act(() => {
			promise = result.current.run('start');
		});
		expect(result.current.status).toBe('running');
		expect(result.current.inFlight).toBe(1);

		act(() => {
			result.current.cancel();
		});
		expect(result.current.status).toBe('idle');
		expect(result.current.inFlight).toBe(0);

		await act(async () => {
			deferred.resolve('ignored');
			await promise;
		});

		expect(result.current.status).toBe('idle');
		expect(result.current.result).toBeUndefined();
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

	it('reset clears state without cancelling in-flight requests', async () => {
		const deferred = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => deferred.promise);

		const { result } = renderUseActionHook(action);
		let promise!: Promise<string>;
		act(() => {
			promise = result.current.run('value');
		});

		act(() => {
			result.current.reset();
		});

		expect(result.current.status).toBe('idle');
		expect(result.current.error).toBeUndefined();
		expect(result.current.result).toBeUndefined();

		await act(async () => {
			deferred.resolve('complete');
			await promise;
		});

		expect(result.current.status).toBe('success');
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
		const dispatchMock = window.wp?.data?.dispatch as jest.Mock;
		dispatchMock.mockReset();
		dispatchMock.mockImplementation(() => ({}));

		const { result } = renderUseActionHook(action);

		expect(() => result.current.run({} as never)).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'Failed to resolve kernel action dispatcher'
				),
			})
		);

		dispatchMock.mockReset();
	});

	it('ignores duplicate store registration errors', async () => {
		resetActionStoreMarker();
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
		resetActionStoreMarker();
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
		resetActionStoreMarker();
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
		const windowWithWp = global.window as Window & { wp?: any };
		const originalWp = windowWithWp.wp;
		windowWithWp.wp = undefined;

		const action = makeDefinedAction(async () => 'noop');
		const { result } = renderUseActionHook(action);

		expect(() => result.current.run({} as never)).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'useAction requires the WordPress data registry'
				),
			})
		);

		windowWithWp.wp = originalWp;
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
		resetActionStoreMarker();
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
		resetActionStoreMarker();
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
		resetActionStoreMarker();
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
		resetActionStoreMarker();
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
