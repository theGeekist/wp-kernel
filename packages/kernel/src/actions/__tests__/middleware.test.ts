import { createActionMiddleware, invokeAction } from '../middleware';
import { defineAction } from '../define';

describe('createActionMiddleware', () => {
	it('executes defined actions and returns their promise', async () => {
		const middleware = createActionMiddleware();
		const api = { dispatch: jest.fn(), getState: jest.fn() };
		const next = jest.fn();
		const invoke = middleware(api)(next);

		const action = defineAction<{ value: number }, number>(
			'Thing.Double',
			async (_ctx, args) => {
				return args.value * 2;
			}
		);

		const result = await invoke(invokeAction(action, { value: 5 }));

		expect(result).toBe(10);
		expect(next).not.toHaveBeenCalled();
	});

	it('forwards non-kernel actions to next middleware', () => {
		const middleware = createActionMiddleware();
		const api = { dispatch: jest.fn(), getState: jest.fn() };
		const next = jest.fn();
		const invoke = middleware(api)(next);

		const randomAction = { type: 'RANDOM', payload: 123 };
		invoke(randomAction);

		expect(next).toHaveBeenCalledWith(randomAction);
	});
});
