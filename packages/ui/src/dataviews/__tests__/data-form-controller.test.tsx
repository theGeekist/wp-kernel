import { act } from 'react';
import type { DefinedAction } from '@geekist/wp-kernel/actions';
import { KernelError } from '@geekist/wp-kernel/error';
import type {
	ResourceObject,
	CacheKeyPattern,
} from '@geekist/wp-kernel/resource';
import * as errorUtils from '../error-utils';
import type { KernelUIRuntime } from '@geekist/wp-kernel/data';
import { KernelUIProvider } from '../../runtime/context';
import { createRoot } from 'react-dom/client';
import {
	__TESTING__ as dataFormTesting,
	createDataFormController,
} from '../data-form-controller';
import type { DataViewsRuntimeContext } from '../types';

jest.mock('../../hooks/useAction', () => ({
	useAction: jest.fn(),
}));

const useActionMock = jest.requireMock('../../hooks/useAction')
	.useAction as jest.Mock;

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createRuntime(): KernelUIRuntime {
	return {
		kernel: undefined,
		namespace: 'tests',
		reporter: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => ({
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			})),
		} as any,
		registry: undefined,
		events: {} as never,
		policies: undefined,
		invalidate: jest.fn(),
		options: {},
		dataviews: {
			registry: new Map(),
			controllers: new Map(),
			preferences: {
				adapter: {
					get: async () => undefined,
					set: async () => undefined,
				},
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
			},
			reporter: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(() => ({
					debug: jest.fn(),
					error: jest.fn(),
					info: jest.fn(),
					warn: jest.fn(),
					child: jest.fn(),
				})),
			} as any,
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(),
		},
	} as unknown as KernelUIRuntime;
}

function renderHookWithProvider<T>(hook: () => T, runtime: KernelUIRuntime) {
	const container = document.createElement('div');
	const root = createRoot(container);
	const result: { current: T } = { current: undefined as unknown as T };
	act(() => {
		root.render(
			<KernelUIProvider runtime={runtime}>
				<HookRunner hook={hook} result={result} />
			</KernelUIProvider>
		);
	});
	return { result, root };
}

function HookRunner<T>({
	hook,
	result,
}: {
	hook: () => T;
	result: { current: T };
}) {
	result.current = hook();
	return null;
}

describe('createDataFormController', () => {
	beforeEach(() => {
		useActionMock.mockReset();
	});

	it('runs action and invalidates cache', async () => {
		const runtime = createRuntime();
		const runMock = jest.fn().mockResolvedValue({ ok: true });
		useActionMock.mockImplementation((_action, opts) => ({
			run: async (input: unknown) => {
				const result = await runMock(input);
				const patterns = opts?.autoInvalidate?.(
					result,
					input as unknown
				);
				if (patterns && patterns.length > 0) {
					runtime.invalidate?.(patterns);
				}
				return result;
			},
			status: 'idle',
			error: undefined,
			inFlight: 0,
			cancel: jest.fn(),
			reset: jest.fn(),
			result: undefined,
		}));

		const action = Object.assign(async () => ({ ok: true }), {
			actionName: 'jobs.save',
			options: { scope: 'crossTab', bridged: true },
		}) as DefinedAction<{ title: string }, { ok: boolean }>;

		const resource = {
			key: jest.fn(() => ['jobs', 'list']),
			invalidate: jest.fn(),
		} as unknown as ResourceObject<unknown, unknown>;

		const controllerFactory = createDataFormController({
			action,
			runtime: runtime as unknown as DataViewsRuntimeContext,
			resource,
			resourceName: 'jobs',
		});

		const { result } = renderHookWithProvider(controllerFactory, runtime);

		await act(async () => {
			await result.current.submit({ title: 'Engineer' });
		});

		expect(runMock).toHaveBeenCalledWith({ title: 'Engineer' });
		expect(runtime.invalidate).toHaveBeenCalledWith([['jobs', 'list']]);
	});

	it('normalizes errors before throwing', async () => {
		const runtime = createRuntime();
		const kernelError = new KernelError('ValidationError', {
			message: 'Invalid data',
		});
		useActionMock.mockImplementation(() => ({
			run: jest.fn(async () => {
				throw kernelError;
			}),
			status: 'idle',
			error: undefined,
			inFlight: 0,
			cancel: jest.fn(),
			reset: jest.fn(),
			result: undefined,
		}));

		const action = Object.assign(async () => undefined, {
			actionName: 'jobs.save',
			options: { scope: 'crossTab', bridged: true },
		}) as DefinedAction<Record<string, unknown>, void>;

		const controllerFactory = createDataFormController({
			action,
			runtime: runtime as unknown as DataViewsRuntimeContext,
			resourceName: 'jobs',
		});

		const { result } = renderHookWithProvider(controllerFactory, runtime);

		await expect(
			act(async () => {
				await result.current.submit({});
			})
		).rejects.toThrow('Invalid data');
	});

	it('computes default invalidation patterns', () => {
		const { defaultInvalidate } = dataFormTesting;
		const noResourceInvalidate = defaultInvalidate(undefined);
		expect(noResourceInvalidate({}, {})).toBe(false);

		const resource = {
			key: jest.fn(() => ['jobs', 'list'] as CacheKeyPattern),
		} as unknown as ResourceObject<unknown, unknown>;
		const invalidate = defaultInvalidate(resource);
		expect(invalidate({}, {})).toEqual([['jobs', 'list']]);
	});

	it('falls back to unknown action name when missing', async () => {
		const runtime = createRuntime();
		const kernelError = new KernelError('ValidationError', {
			message: 'Failure',
		});
		useActionMock.mockImplementation(() => ({
			run: jest.fn(async () => {
				throw kernelError;
			}),
			status: 'idle',
			error: undefined,
			inFlight: 0,
			cancel: jest.fn(),
			reset: jest.fn(),
			result: undefined,
		}));

		const normalizeSpy = jest.spyOn(errorUtils, 'normalizeActionError');

		const action = Object.assign(async () => undefined, {
			actionName: undefined as unknown as string,
			options: { scope: 'crossTab', bridged: true },
		}) as DefinedAction<Record<string, unknown>, void>;

		const controllerFactory = createDataFormController({
			action,
			runtime: runtime as unknown as DataViewsRuntimeContext,
			resourceName: 'jobs',
		});

		const { result } = renderHookWithProvider(controllerFactory, runtime);

		await expect(
			act(async () => {
				await result.current.submit({});
			})
		).rejects.toThrow('Failure');

		expect(normalizeSpy).toHaveBeenCalledWith(
			kernelError,
			expect.objectContaining({
				actionId: 'unknown.action',
				resource: 'jobs',
			}),
			runtime.reporter
		);

		normalizeSpy.mockRestore();
	});
});
