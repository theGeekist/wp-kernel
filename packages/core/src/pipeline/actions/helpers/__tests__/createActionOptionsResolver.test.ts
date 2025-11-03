import { createActionOptionsResolver } from '../createActionOptionsResolver';
import type { ActionPipelineContext } from '../../types';
import type { ResolvedActionOptions } from '../../../../actions/types';

describe('createActionOptionsResolver', () => {
	it('resolves options and stores them on context and draft', async () => {
		const helper = createActionOptionsResolver<void, string>();
		const context: ActionPipelineContext<void, string> = {
			actionName: 'Test.Action',
			namespace: 'tests',
			reporter: {} as never,
			requestId: 'request-id',
			config: {
				name: 'Test.Action',
				handler: async () => 'ok',
				options: { scope: 'tabLocal' },
			},
			args: undefined,
			definition: {
				action: (async () => undefined) as never,
				namespace: 'tests',
			},
		};
		const draft: { resolvedOptions?: ResolvedActionOptions } = {};

		await helper.apply({
			context,
			reporter: context.reporter,
			input: { args: undefined },
			output: draft,
		});

		expect(context.resolvedOptions).toEqual({
			scope: 'tabLocal',
			bridged: false,
		});
		expect(draft.resolvedOptions).toEqual({
			scope: 'tabLocal',
			bridged: false,
		});
	});
});
