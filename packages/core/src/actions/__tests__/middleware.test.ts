import { createActionMiddleware, invokeAction } from '../middleware';
import { defineAction } from '../define';
import type { ActionConfig, ActionOptions } from '../types';

function createAction<TArgs = void, TResult = void>(
	name: string,
	handler: ActionConfig<TArgs, TResult>['handler'],
	options?: ActionOptions
) {
	return defineAction<TArgs, TResult>({ name, handler, options });
}

describe('createActionMiddleware', () => {
	it('executes defined actions and returns their promise', async () => {
		const middleware = createActionMiddleware();
		const api = { dispatch: jest.fn(), getState: jest.fn() };
		const next = jest.fn();
		const invoke = middleware(api)(next);

		const action = createAction<{ value: number }, number>(
			'Thing.Double',
			async (_ctx, args) => {
				return args.value * 2;
			}
		);

		const result = await invoke(invokeAction(action, { value: 5 }));

		expect(result).toBe(10);
		expect(next).not.toHaveBeenCalled();
	});

	it('forwards non-WP Kernel actions to next middleware', () => {
		const middleware = createActionMiddleware();
		const api = { dispatch: jest.fn(), getState: jest.fn() };
		const next = jest.fn();
		const invoke = middleware(api)(next);

		const randomAction = { type: 'RANDOM', payload: 123 };
		invoke(randomAction);

		expect(next).toHaveBeenCalledWith(randomAction);
	});
});
