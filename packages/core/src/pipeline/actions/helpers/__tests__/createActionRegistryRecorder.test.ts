import { createActionRegistryRecorder } from '../createActionRegistryRecorder';
import type { ActionPipelineContext } from '../../types';

describe('createActionRegistryRecorder', () => {
	it('invokes registry bridge after downstream builders', async () => {
		const helper = createActionRegistryRecorder<void, void>();
		const recordActionDefined = jest.fn();
		const context: ActionPipelineContext<void, void> = {
			actionName: 'Test.Action',
			namespace: 'tests',
			reporter: {} as never,
			requestId: 'req',
			resolvedOptions: { scope: 'crossTab', bridged: true },
			actionContext: {} as never,
			config: {
				name: 'Test.Action',
				handler: async () => undefined,
			},
			args: undefined,
			definition: {
				action: (async () => undefined) as never,
				namespace: 'tests',
			},
			registry: { recordActionDefined },
		};

		const order: string[] = [];

		await helper.apply(
			{
				context,
				reporter: context.reporter,
				input: { args: undefined, handler: async () => undefined },
				output: {},
			},
			async () => {
				order.push('next');
			}
		);

		expect(order).toEqual(['next']);
		expect(recordActionDefined).toHaveBeenCalledWith(context.definition);
	});

	it('tolerates missing registry bridges', async () => {
		const helper = createActionRegistryRecorder<void, void>();
		const context: ActionPipelineContext<void, void> = {
			actionName: 'No.Registry',
			namespace: 'tests',
			reporter: {} as never,
			requestId: 'req',
			resolvedOptions: { scope: 'crossTab', bridged: true },
			actionContext: {} as never,
			config: {
				name: 'No.Registry',
				handler: async () => undefined,
			},
			args: undefined,
			definition: {
				action: (async () => undefined) as never,
				namespace: 'tests',
			},
		};

		await expect(
			helper.apply(
				{
					context,
					reporter: context.reporter,
					input: { args: undefined, handler: async () => undefined },
					output: {},
				},
				undefined
			)
		).resolves.toBeUndefined();
	});
});
