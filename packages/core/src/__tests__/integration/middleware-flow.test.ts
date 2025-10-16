/**
 * @file Integration test for Redux middleware with defineAction.
 *
 * Tests the middleware behavior including:
 * - Action envelope creation
 * - Middleware interception
 * - Pass-through of standard Redux actions
 * - Envelope metadata preservation
 */

import { defineAction } from '../../actions/define';
import type {
	ActionConfig,
	ActionOptions,
	ReduxDispatch,
} from '../../actions/types';
import { createActionMiddleware, invokeAction } from '../../actions/middleware';
import { defineResource } from '../../resource/define';
import {
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '../../../tests/wp-environment.test-support';

function createAction<TArgs = void, TResult = void>(
	name: string,
	handler: ActionConfig<TArgs, TResult>['handler'],
	options?: ActionOptions
) {
	return defineAction<TArgs, TResult>({ name, handler, options });
}

type TestItem = {
	id: number;
	title: string;
};

describe('Redux Middleware Integration', () => {
	let harness: WordPressTestHarness;
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;
	let next: jest.MockedFunction<ReduxDispatch>;
	let middleware: ReduxDispatch;

	beforeEach(() => {
		harness = createWordPressTestHarness({
			apiFetch: jest.fn(),
			hooks: { doAction: jest.fn() },
		});

		mockApiFetch = harness.wp.apiFetch as unknown as jest.Mock;
		mockDoAction = harness.wp.hooks?.doAction as unknown as jest.Mock;
		next = jest
			.fn((action: unknown) => action)
			.mockName('next') as jest.MockedFunction<ReduxDispatch>;

		middleware = createActionMiddleware()({
			dispatch: jest.fn(),
			getState: jest.fn(),
		})(next) as ReduxDispatch;
	});

	afterEach(() => {
		harness.teardown();
	});

	it('intercepts and executes action envelopes', async () => {
		const createdItem = { id: 1, title: 'Test Item' };
		mockApiFetch.mockResolvedValue(createdItem);

		const resource = defineResource<TestItem>({
			name: 'testitem',
			routes: {
				create: { path: '/test/v1/items', method: 'POST' },
			},
		});

		const CreateItem = createAction<{ data: { title: string } }, TestItem>(
			'Item.Create',
			async (ctx, { data }) => {
				const created = await resource.create!(data);
				ctx.emit('item.created', { id: created.id });
				return created;
			}
		);

		// Create action envelope
		const envelope = invokeAction(CreateItem, {
			data: { title: 'Test Item' },
		});

		// Dispatch through middleware
		const result = await middleware(envelope);

		// Verify result
		expect(result).toEqual(createdItem);

		// Verify resource was called
		expect(mockApiFetch).toHaveBeenCalledWith({
			path: '/test/v1/items',
			method: 'POST',
			data: { title: 'Test Item' },
			parse: true,
		});

		// Verify lifecycle events
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Item.Create' })
		);
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({
				actionName: 'Item.Create',
				result: createdItem,
			})
		);
		expect(mockDoAction).toHaveBeenCalledWith('item.created', { id: 1 });

		// Verify next was NOT called (middleware intercepted)
		expect(next).not.toHaveBeenCalled();
	});

	it('allows standard Redux actions to pass through unchanged', () => {
		const standardAction = {
			type: 'ADD_ITEM',
			item: { id: 1, title: 'Standard Action' },
		};

		// Dispatch standard action through middleware
		const result = middleware(standardAction);

		// Verify it was passed to next middleware
		expect(next).toHaveBeenCalledWith(standardAction);
		expect(result).toBe(standardAction);
	});

	it('handles action errors through middleware', async () => {
		mockApiFetch.mockRejectedValue(new Error('API Error'));

		const resource = defineResource<TestItem>({
			name: 'testitem',
			routes: {
				create: { path: '/test/v1/items', method: 'POST' },
			},
		});

		const CreateItem = createAction<{ data: { title: string } }, TestItem>(
			'Item.Create',
			async (_ctx, { data }) => {
				return await resource.create!(data);
			}
		);

		const envelope = invokeAction(CreateItem, {
			data: { title: 'Test Item' },
		});

		// Expect promise rejection
		await expect(middleware(envelope)).rejects.toThrow();

		// Verify error lifecycle event
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({
				actionName: 'Item.Create',
				phase: 'error',
			})
		);
	});

	it('preserves action metadata in envelope', async () => {
		const createdItem = { id: 1, title: 'Test Item' };
		mockApiFetch.mockResolvedValue(createdItem);

		const resource = defineResource<TestItem>({
			name: 'testitem',
			routes: {
				create: { path: '/test/v1/items', method: 'POST' },
			},
		});

		const CreateItem = createAction<{ data: { title: string } }, TestItem>(
			'Item.Create',
			async (_ctx, { data }) => {
				return await resource.create!(data);
			}
		);

		// Create envelope with metadata
		const envelope = invokeAction(
			CreateItem,
			{ data: { title: 'Test Item' } },
			{ correlationId: 'req-123', source: 'test-suite' }
		);

		// Verify envelope structure
		expect(envelope.type).toBe('@@wp-kernel/EXECUTE_ACTION');
		expect(envelope.__kernelAction).toBe(true);
		expect(envelope.meta).toEqual({
			correlationId: 'req-123',
			source: 'test-suite',
		});
		expect(envelope.payload.action).toBe(CreateItem);
		expect(envelope.payload.args).toEqual({ data: { title: 'Test Item' } });

		// Dispatch and verify it works
		const result = await middleware(envelope);
		expect(result).toEqual(createdItem);
	});
});
