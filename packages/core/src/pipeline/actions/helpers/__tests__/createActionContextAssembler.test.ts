import { createActionContextAssembler } from '../createActionContextAssembler';
import type { ActionPipelineContext } from '../../types';
import { WPKernelError } from '../../../../error/WPKernelError';

jest.mock('../../../../actions/context', () => ({
	createActionContext: jest.fn(() => ({
		reporter: { channel: 'all' },
		namespace: 'tests/namespace',
	})),
}));

const { createActionContext } = jest.requireMock('../../../../actions/context');

describe('createActionContextAssembler', () => {
	it('creates an action context and updates reporter/namespace', async () => {
		const helper = createActionContextAssembler<void, void>();
		const context: ActionPipelineContext<void, void> = {
			actionName: 'Test.Action',
			namespace: 'tests',
			reporter: { channel: 'none' } as never,
			requestId: 'req',
			resolvedOptions: { scope: 'crossTab', bridged: true },
			config: {
				name: 'Test.Action',
				handler: async () => undefined,
			},
			args: undefined,
			definition: {
				action: (async () => undefined) as never,
				namespace: 'tests',
			},
		};

		const initialReporter = context.reporter;

		await helper.apply({
			context,
			reporter: context.reporter,
			input: { args: undefined },
			output: {},
		});

		expect(createActionContext).toHaveBeenCalledWith(
			'Test.Action',
			'req',
			context.resolvedOptions,
			initialReporter
		);
		expect(context.actionContext).toBeDefined();
		expect(context.reporter).toEqual({ channel: 'all' });
		expect(context.namespace).toBe('tests/namespace');
	});

	it('throws when resolved options are missing', async () => {
		const helper = createActionContextAssembler<void, void>();
		const context: ActionPipelineContext<void, void> = {
			actionName: 'Missing.Options',
			namespace: 'tests',
			reporter: { channel: 'none' } as never,
			requestId: 'req',
			config: {
				name: 'Missing.Options',
				handler: async () => undefined,
			},
			args: undefined,
			definition: {
				action: (async () => undefined) as never,
				namespace: 'tests',
			},
		};

		expect(() =>
			helper.apply({
				context,
				reporter: context.reporter,
				input: { args: undefined },
				output: {},
			})
		).toThrow(WPKernelError);
	});
});
