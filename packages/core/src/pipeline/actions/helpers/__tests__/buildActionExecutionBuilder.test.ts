import type { ActionPipelineContext } from '../../types';
import type { ResolvedActionOptions } from '../../../../actions/types';
import type { Reporter } from '../../../../reporter/types';

jest.mock('../../../../actions/context', () => ({
	emitLifecycleEvent: jest.fn(),
}));

jest.mock('../../../../actions/lifecycle', () => ({
	createActionLifecycleEvent: jest.fn(),
	normalizeActionError: jest.fn(),
}));

jest.mock('../timing', () => ({
	readMonotonicTime: jest.fn(),
	measureDurationMs: jest.fn(),
}));

import { emitLifecycleEvent } from '../../../../actions/context';
import {
	createActionLifecycleEvent,
	normalizeActionError,
} from '../../../../actions/lifecycle';
import { measureDurationMs, readMonotonicTime } from '../timing';
import { buildActionExecutionBuilder } from '../buildActionExecutionBuilder';

describe('buildActionExecutionBuilder', () => {
	const resolvedOptions: ResolvedActionOptions = {
		scope: 'crossTab',
		bridged: true,
	};
	const reporter = {} as Reporter;
	const baseContext: ActionPipelineContext<
		{ value: number },
		{ ok: boolean }
	> = {
		actionContext: {} as never,
		actionName: 'Test.Action',
		namespace: 'test',
		reporter,
		requestId: 'request-id',
		resolvedOptions,
		config: {
			name: 'Test.Action',
			handler: async () => ({ ok: true }),
		},
		args: { value: 0 },
		definition: {
			action: (async () => undefined) as never,
			namespace: 'test',
		},
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('emits completion after downstream builders succeed', async () => {
		(measureDurationMs as jest.Mock).mockReturnValue(15);
		(readMonotonicTime as jest.Mock).mockReturnValue(5);
		(createActionLifecycleEvent as jest.Mock).mockImplementation(
			(phase: string) => ({ phase })
		);
		const order: string[] = [];
		const handler = jest.fn(async () => {
			order.push('handler');
			return { ok: true };
		});
		const helper = buildActionExecutionBuilder<
			{ value: number },
			{ ok: boolean }
		>();
		(emitLifecycleEvent as jest.Mock).mockImplementation(
			(event: { phase: string }) => {
				order.push(event.phase);
			}
		);

		await helper.apply(
			{
				context: baseContext,
				reporter,
				input: { args: { value: 1 }, handler },
				output: {},
			},
			async () => {
				order.push('next');
			}
		);

		expect(order).toEqual(['handler', 'next', 'complete']);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(createActionLifecycleEvent).toHaveBeenCalledWith(
			'complete',
			resolvedOptions,
			baseContext.actionName,
			baseContext.requestId,
			baseContext.namespace,
			expect.objectContaining({ result: { ok: true }, durationMs: 15 })
		);
	});

	it('normalises downstream failures and clears stale results', async () => {
		const error = new Error('builder failed');
		const normalized = { code: 'UnknownError' };
		(measureDurationMs as jest.Mock).mockReturnValue(20);
		(readMonotonicTime as jest.Mock).mockReturnValue(10);
		(createActionLifecycleEvent as jest.Mock).mockImplementation(
			(phase: string) => ({ phase })
		);
		(normalizeActionError as jest.Mock).mockReturnValue(normalized);
		const order: string[] = [];
		const handler = jest.fn(async () => {
			order.push('handler');
			return { ok: true };
		});
		(emitLifecycleEvent as jest.Mock).mockImplementation(
			(event: { phase: string }) => {
				order.push(event.phase);
			}
		);
		const helper = buildActionExecutionBuilder<
			{ value: number },
			{ ok: boolean }
		>();

		await expect(
			helper.apply(
				{
					context: baseContext,
					reporter,
					input: { args: { value: 2 }, handler },
					output: {},
				},
				async () => {
					order.push('next');
					throw error;
				}
			)
		).rejects.toBe(normalized);

		expect(order).toEqual(['handler', 'next', 'error']);
		expect(normalizeActionError).toHaveBeenCalledWith(
			error,
			baseContext.actionName,
			baseContext.requestId
		);
		expect(createActionLifecycleEvent).toHaveBeenCalledWith(
			'error',
			resolvedOptions,
			baseContext.actionName,
			baseContext.requestId,
			baseContext.namespace,
			expect.objectContaining({ error: normalized, durationMs: 20 })
		);
	});

	it('respects an existing start time captured by upstream fragments', async () => {
		(measureDurationMs as jest.Mock).mockReturnValue(8);
		(createActionLifecycleEvent as jest.Mock).mockImplementation(
			(phase: string) => ({ phase })
		);
		(readMonotonicTime as jest.Mock).mockImplementation(() => {
			throw new Error('should not read start time');
		});

		const helper = buildActionExecutionBuilder<
			{ value: number },
			{ ok: boolean }
		>();

		await helper.apply(
			{
				context: baseContext,
				reporter,
				input: {
					args: { value: 3 },
					handler: async () => ({ ok: true }),
				},
				output: { startTime: 25 },
			},
			undefined
		);

		expect(readMonotonicTime).not.toHaveBeenCalled();
		expect(measureDurationMs).toHaveBeenCalledWith(25);
	});
});
