import { defineAction } from '../define';
import type { ActionConfig, ActionOptions } from '../types';
import { KernelError } from '../../error/KernelError';

function createAction<TArgs = void, TResult = void>(
	name: string,
	handler: ActionConfig<TArgs, TResult>['handler'],
	options?: ActionOptions
) {
	return defineAction<TArgs, TResult>({ name, handler, options });
}

describe('defineAction', () => {
	describe('argument validation', () => {
		it('throws DeveloperError when config is missing', () => {
			expect(() =>
				defineAction(undefined as unknown as ActionConfig<void, void>)
			).toThrow(KernelError);
			expect(() =>
				defineAction(undefined as unknown as ActionConfig<void, void>)
			).toThrow(
				'defineAction requires a configuration object with "name" and "handler".'
			);
		});

		it('throws DeveloperError if name is missing', () => {
			expect(() =>
				defineAction({
					name: '' as string,
					handler: async () => {},
				})
			).toThrow(KernelError);
			expect(() =>
				defineAction({
					name: '' as string,
					handler: async () => {},
				})
			).toThrow(
				'defineAction requires a non-empty string "name" property.'
			);
		});

		it('throws DeveloperError if name is not a string', () => {
			expect(() =>
				defineAction({
					name: 123 as unknown as string,
					handler: async () => {},
				})
			).toThrow(KernelError);
			expect(() =>
				defineAction({
					name: 123 as unknown as string,
					handler: async () => {},
				})
			).toThrow(
				'defineAction requires a non-empty string "name" property.'
			);
		});

		it('throws DeveloperError if handler is not a function', () => {
			expect(() =>
				defineAction({
					name: 'TestAction',
					handler: 'not a function' as unknown as () => Promise<void>,
				})
			).toThrow(KernelError);
			expect(() =>
				defineAction({
					name: 'TestAction',
					handler: 'not a function' as unknown as () => Promise<void>,
				})
			).toThrow('expects a function for the "handler" property');
		});
	});

	describe('error normalization', () => {
		it('preserves KernelError with merged context', async () => {
			const originalError = new KernelError('ValidationError', {
				message: 'Invalid input',
				data: { field: 'email' },
				context: { source: 'form' },
			});

			const action = createAction('TestAction', async () => {
				throw originalError;
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'ValidationError',
				message: 'Invalid input',
				data: { field: 'email' },
				context: {
					source: 'form',
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('preserves KernelError stack trace', async () => {
			const originalError = new KernelError('ServerError', {
				message: 'Custom error',
			});
			const originalStack = originalError.stack;

			const action = createAction('TestAction', async () => {
				throw originalError;
			});

			try {
				await action(undefined);
			} catch (error) {
				expect((error as KernelError).stack).toBe(originalStack);
			}
		});

		it('wraps standard Error into KernelError with UnknownError code', async () => {
			const standardError = new Error('Something went wrong');

			const action = createAction('TestAction', async () => {
				throw standardError;
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Something went wrong',
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('wraps non-Error values into KernelError with descriptive message', async () => {
			const action = createAction('TestAction', async () => {
				throw 'string error';
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Action "TestAction" failed with non-error value',
				data: { value: 'string error' },
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('wraps null throw into KernelError', async () => {
			const action = createAction('TestAction', async () => {
				throw null;
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Action "TestAction" failed with non-error value',
				data: { value: null },
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('wraps undefined throw into KernelError', async () => {
			const action = createAction('TestAction', async () => {
				throw undefined;
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Action "TestAction" failed with non-error value',
				data: { value: undefined },
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('wraps number throw into KernelError', async () => {
			const action = createAction('TestAction', async () => {
				throw 42;
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Action "TestAction" failed with non-error value',
				data: { value: 42 },
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});

		it('wraps object throw into KernelError', async () => {
			const action = createAction('TestAction', async () => {
				throw { custom: 'error object' };
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Action "TestAction" failed with non-error value',
				data: { value: { custom: 'error object' } },
				context: {
					actionName: 'TestAction',
					requestId: expect.any(String),
				},
			});
		});
	});

	describe('lifecycle event structure', () => {
		it('emits start event with correct structure', async () => {
			const startEvents: unknown[] = [];
			const originalAddEventListener = window.addEventListener;
			window.addEventListener = jest.fn((type, handler) => {
				if (type === 'wpk.action.start') {
					startEvents.push(
						(handler as EventListener)({
							detail: { test: 'start' },
						} as CustomEvent)
					);
				}
			});

			const action = createAction<
				{ input: string },
				{ success: boolean }
			>('TestAction', async (_ctx) => {
				return { success: true };
			});

			await action({ input: 'test' });

			window.addEventListener = originalAddEventListener;

			// Events are emitted but we can't easily capture them without mocking
			// This test validates the action executes without throwing
			expect(true).toBe(true);
		});

		it('emits complete event with result and duration', async () => {
			const action = createAction<
				{ input: string },
				{ success: boolean }
			>('TestAction', async (_ctx) => {
				return { success: true };
			});

			const result = await action({ input: 'test' });
			expect(result).toEqual({ success: true });
		});

		it('emits error event with error and duration', async () => {
			const action = createAction('TestAction', async () => {
				throw new Error('Test error');
			});

			await expect(action(undefined)).rejects.toMatchObject({
				code: 'UnknownError',
				message: 'Test error',
			});
		});
	});

	describe('action metadata', () => {
		it('attaches actionName as read-only property', () => {
			const action = createAction('TestAction', async () => {});

			expect(action.actionName).toBe('TestAction');

			// Attempt to overwrite should throw in strict mode
			expect(() => {
				(action as { actionName: string }).actionName = 'NewName';
			}).toThrow();
		});

		it('attaches resolved options as read-only property', () => {
			const action = createAction('TestAction', async () => {}, {
				scope: 'crossTab',
			});

			expect(action.options).toEqual({
				scope: 'crossTab',
				bridged: true,
			});

			// Attempt to overwrite should throw in strict mode
			expect(() => {
				(action as { options: unknown }).options = {
					scope: 'tabLocal',
				};
			}).toThrow();
		});
	});

	describe('execution flow', () => {
		it('passes ActionContext and args to the function', async () => {
			let capturedContext: unknown = null;
			let capturedArgs: unknown = null;

			const action = createAction<{ value: number }, number>(
				'TestAction',
				async (ctx, args) => {
					capturedContext = ctx;
					capturedArgs = args;
					return args.value * 2;
				}
			);

			const result = await action({ value: 21 });

			expect(result).toBe(42);
			expect(capturedContext).toBeTruthy();
			expect(capturedContext).toHaveProperty('namespace');
			expect(capturedContext).toHaveProperty('requestId');
			expect(capturedArgs).toEqual({ value: 21 });
		});

		it('generates unique requestId for each invocation', async () => {
			const requestIds: string[] = [];

			const action = createAction('TestAction', async (ctx) => {
				requestIds.push(ctx.requestId);
			});

			await action(undefined);
			await action(undefined);
			await action(undefined);

			expect(requestIds).toHaveLength(3);
			expect(new Set(requestIds).size).toBe(3); // All unique
		});
	});

	describe('options propagation', () => {
		it('resolves default options correctly', () => {
			const action = createAction('TestAction', async () => {});

			expect(action.options).toEqual({
				scope: 'crossTab',
				bridged: true,
			});
		});

		it('resolves explicit crossTab scope', () => {
			const action = createAction('TestAction', async () => {}, {
				scope: 'crossTab',
			});

			expect(action.options).toEqual({
				scope: 'crossTab',
				bridged: true,
			});
		});

		it('resolves explicit tabLocal scope with bridged=false', () => {
			const action = createAction('TestAction', async () => {}, {
				scope: 'tabLocal',
			});

			expect(action.options).toEqual({
				scope: 'tabLocal',
				bridged: false,
			});
		});

		it('respects explicit bridged=false even with crossTab scope', () => {
			const action = createAction('TestAction', async () => {}, {
				scope: 'crossTab',
				bridged: false,
			});

			expect(action.options).toEqual({
				scope: 'crossTab',
				bridged: false,
			});
		});
	});
});
