import { defineAction } from '../define';
import { WPKernelError } from '../../error/WPKernelError';
import {
	resetCorePipelineConfig,
	setCorePipelineConfig,
} from '../../configuration/flags';
import * as pipelineModule from '../../pipeline/actions/createActionPipeline';

type WindowWithHooks = Window & { wp?: { hooks?: { doAction: jest.Mock } } };

describe('defineAction pipeline integration', () => {
	let doAction: jest.Mock;
	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;
	let originalWp: WindowWithHooks['wp'];

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
		setCorePipelineConfig({ enabled: true });
		doAction = jest.fn();
		const windowWithWp = window as WindowWithHooks;
		originalWp = windowWithWp.wp;
		(window as unknown as { wp?: unknown }).wp = {
			...(originalWp ?? {}),
			hooks: { doAction } as unknown,
		};
	});

	afterEach(() => {
		resetCorePipelineConfig();
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
		(window as unknown as { wp?: unknown }).wp = originalWp;
	});

	it('uses the pipeline when enabled', async () => {
		const pipelineSpy = jest.spyOn(pipelineModule, 'createActionPipeline');
		const handler = jest
			.fn()
			.mockImplementation(async (_ctx, args: { value: number }) => ({
				doubled: args.value * 2,
			}));

		const action = defineAction<{ value: number }, { doubled: number }>({
			name: 'Pipeline.Test',
			handler,
		});

		expect(pipelineSpy).toHaveBeenCalled();

		const result = await action({ value: 5 });

		expect(result).toEqual({ doubled: 10 });
		expect(handler).toHaveBeenCalled();
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Pipeline.Test' })
		);
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({ actionName: 'Pipeline.Test' })
		);

		pipelineSpy.mockRestore();
	});

	it('normalises errors via the pipeline', async () => {
		const pipelineSpy = jest.spyOn(pipelineModule, 'createActionPipeline');
		const action = defineAction({
			name: 'Pipeline.Fail',
			handler: async () => {
				throw new Error('boom');
			},
		});

		await expect(action(undefined as never)).rejects.toBeInstanceOf(
			WPKernelError
		);

		expect(pipelineSpy).toHaveBeenCalled();
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({ actionName: 'Pipeline.Fail' })
		);

		pipelineSpy.mockRestore();
	});

	it('falls back to the legacy path when the flag is disabled', () => {
		setCorePipelineConfig({ enabled: false });
		const pipelineSpy = jest.spyOn(pipelineModule, 'createActionPipeline');

		defineAction({
			name: 'Pipeline.Legacy',
			handler: async () => ({ ok: true }),
		});

		expect(pipelineSpy).not.toHaveBeenCalled();

		pipelineSpy.mockRestore();
	});
});
